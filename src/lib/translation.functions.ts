import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getLanguageName } from "@/lib/languages";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FREE_DAILY_LIMIT = 500;

type ChatMessage = { role: "system" | "user"; content: string | Array<{ type: string; [k: string]: unknown }> };

async function callAI(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
  };
  if (opts?.json) body.response_format = { type: "json_object" };

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
    const txt = await res.text();
    console.error("AI gateway error", res.status, txt);
    throw new Error("Translation service error. Please try again.");
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function checkAndIncrementQuota(supabase: any, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("is_premium, daily_count, count_reset_at").eq("id", userId).single();
  if (!profile) throw new Error("Profile not found");
  if (profile.is_premium) return;

  const last = new Date(profile.count_reset_at);
  const now = new Date();
  const sameDay = last.toDateString() === now.toDateString();
  const nextCount = sameDay ? profile.daily_count + 1 : 1;

  if (nextCount > FREE_DAILY_LIMIT) {
    throw new Error(`Daily limit of ${FREE_DAILY_LIMIT} translations reached. Upgrade to Pro for unlimited translations.`);
  }

  await supabase.from("profiles").update({
    daily_count: nextCount,
    count_reset_at: sameDay ? profile.count_reset_at : now.toISOString(),
  }).eq("id", userId);
}

export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      text: z.string().min(1).max(5000),
      sourceLang: z.string().min(2).max(10),
      targetLang: z.string().min(2).max(10),
      mode: z.enum(["text", "voice", "image"]).default("text"),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await checkAndIncrementQuota(supabase, userId);

    const srcLabel = data.sourceLang === "auto" ? "the source language (auto-detect it)" : getLanguageName(data.sourceLang);
    const tgtLabel = getLanguageName(data.targetLang);

    const prompt = `Translate the following text from ${srcLabel} to ${tgtLabel}. Return ONLY a JSON object: {"translation": "<translated text>", "detected_language": "<ISO 639-1 code of the source>"}. Preserve tone, punctuation, and line breaks. Do not add explanations.\n\nText: """${data.text}"""`;

    const raw = await callAI(
      [
        { role: "system", content: "You are a professional translator. You respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      { json: true }
    );

    let parsed: { translation: string; detected_language?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { translation: raw.trim() };
    }

    const detectedLang = parsed.detected_language || (data.sourceLang === "auto" ? "en" : data.sourceLang);

    const { data: row, error } = await supabase
      .from("translations")
      .insert({
        user_id: userId,
        source_lang: detectedLang,
        target_lang: data.targetLang,
        source_text: data.text,
        translated_text: parsed.translation,
        mode: data.mode,
      })
      .select()
      .single();

    if (error) {
      console.error("insert translation error", error);
    }

    return {
      id: row?.id ?? null,
      translation: parsed.translation,
      detectedLanguage: detectedLang,
    };
  });

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      audioBase64: z.string().min(1).max(20_000_000),
      mimeType: z.string().min(1).max(100),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await checkAndIncrementQuota(context.supabase, context.userId);

    const text = await callAI([
      { role: "system", content: "You are a speech-to-text transcriber. Return only the transcribed text, no commentary." },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this audio exactly. Return only the transcript text." },
          { type: "input_audio", input_audio: { data: data.audioBase64, format: data.mimeType.includes("wav") ? "wav" : "mp3" } },
        ],
      },
    ]);

    return { transcript: text.trim() };
  });

export const translateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      imageBase64: z.string().min(1).max(20_000_000),
      mimeType: z.string().min(1).max(100),
      targetLang: z.string().min(2).max(10),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await checkAndIncrementQuota(supabase, userId);

    const tgtLabel = getLanguageName(data.targetLang);

    const raw = await callAI(
      [
        { role: "system", content: "You extract text from images and translate it. Respond only with valid JSON." },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all visible text from this image, then translate it into ${tgtLabel}. Return ONLY a JSON object: {"extracted_text": "<original text>", "translation": "<translated text>", "detected_language": "<ISO 639-1 code>"}. If no text is found, return empty strings.`,
            },
            { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
          ],
        },
      ],
      { json: true }
    );

    let parsed: { extracted_text: string; translation: string; detected_language?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { extracted_text: "", translation: raw, detected_language: "en" };
    }

    if (parsed.extracted_text) {
      await supabase.from("translations").insert({
        user_id: userId,
        source_lang: parsed.detected_language || "en",
        target_lang: data.targetLang,
        source_text: parsed.extracted_text,
        translated_text: parsed.translation,
        mode: "image",
      });
    }

    return {
      extractedText: parsed.extracted_text,
      translation: parsed.translation,
      detectedLanguage: parsed.detected_language || "en",
    };
  });

export const getHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("translations")
      .select("id, source_lang, target_lang, source_text, translated_text, mode, is_favorite, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { translations: data ?? [] };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), isFavorite: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("translations")
      .update({ is_favorite: data.isFavorite })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("translations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, is_premium, daily_count, count_reset_at")
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);

    // Reset count if a new day
    const sameDay = new Date(data.count_reset_at).toDateString() === new Date().toDateString();
    return {
      ...data,
      daily_count: sameDay ? data.daily_count : 0,
      daily_limit: FREE_DAILY_LIMIT,
    };
  });
