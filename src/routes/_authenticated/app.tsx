import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { ArrowLeftRight, Copy, Volume2, Star, X, Mic, Square, Upload, LogOut, Trash2, Menu } from "lucide-react";
import { toast } from "sonner";
import {
  translateText,
  transcribeAudio,
  translateImage,
  getHistory,
  toggleFavorite,
  deleteTranslation,
  getProfile,
} from "@/lib/translation.functions";
import { LANGUAGES, TRANSLATABLE_LANGUAGES, getLanguageName } from "@/lib/languages";
import { useSignOut, useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const historyQuery = queryOptions({ queryKey: ["history"], queryFn: () => getHistory() });
const profileQuery = queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "Workspace — Delight Lingua" }, { name: "description", content: "Your translation workspace." }],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(historyQuery),
    context.queryClient.ensureQueryData(profileQuery),
  ]),
  component: AppPage,
});

type Mode = "text" | "voice" | "image";

function AppPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("fr");
  const [sourceText, setSourceText] = useState("");
  const [translated, setTranslated] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);

  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const auth = useAuth();

  const { data: history } = useQuery(historyQuery);
  const { data: profile } = useQuery(profileQuery);

  const translateFn = useServerFn(translateText);
  const transcribeFn = useServerFn(transcribeAudio);
  const imageFn = useServerFn(translateImage);
  const favFn = useServerFn(toggleFavorite);
  const delFn = useServerFn(deleteTranslation);

  const translate = useMutation({
    mutationFn: (text: string) => translateFn({ data: { text, sourceLang, targetLang, mode } }),
    onSuccess: (res) => {
      setTranslated(res.translation);
      setLastId(res.id);
      setFavorited(false);
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const swapLangs = () => {
    if (sourceLang === "auto") return toast.info("Set a specific source language to swap.");
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translated);
    setTranslated(sourceText);
  };

  const onCopy = () => {
    if (!translated) return;
    navigator.clipboard.writeText(translated);
    toast.success("Copied!");
  };

  const onSpeak = (text: string, lang: string) => {
    if (!text || typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const onFavorite = async () => {
    if (!lastId) return;
    const next = !favorited;
    setFavorited(next);
    await favFn({ data: { id: lastId, isFavorite: next } });
    qc.invalidateQueries({ queryKey: ["history"] });
    toast.success(next ? "Saved to favorites" : "Removed from favorites");
  };

  const onHistoryClick = (item: any) => {
    setMode((item.mode as Mode) || "text");
    setSourceLang(item.source_lang);
    setTargetLang(item.target_lang);
    setSourceText(item.source_text);
    setTranslated(item.translated_text);
    setLastId(item.id);
    setFavorited(item.is_favorite);
  };

  const onDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["history"] });
    if (lastId === id) {
      setSourceText("");
      setTranslated("");
      setLastId(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const initials = (profile?.display_name || auth.user?.email || "U").slice(0, 2).toUpperCase();
  const recent = history?.translations.filter((t: any) => !t.is_favorite).slice(0, 8) ?? [];
  const favorites = history?.translations.filter((t: any) => t.is_favorite).slice(0, 8) ?? [];

  return (
    <div className="flex h-screen bg-ui-bg font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border bg-background flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="font-display italic text-2xl text-brand">Delight Lingua</Link>
          <div className="size-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
            <div className="size-2 rounded-full bg-brand" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent History</h3>
            <div className="space-y-1">
              {recent.length === 0 && <p className="px-3 text-sm text-slate-400">No translations yet.</p>}
              {recent.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => onHistoryClick(t)}
                  className={`group relative w-full text-left px-3 py-2.5 rounded-lg transition-colors ${lastId === t.id ? "bg-slate-50 border border-slate-100" : "hover:bg-slate-50"}`}
                >
                  <p className="text-xs font-medium text-slate-500 mb-0.5">
                    {getLanguageName(t.source_lang)} → {getLanguageName(t.target_lang)}
                  </p>
                  <p className="text-sm text-slate-800 line-clamp-1 pr-6">{t.source_text}</p>
                  <span onClick={(e) => onDelete(t.id, e)} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 text-slate-400 cursor-pointer">
                    <Trash2 className="size-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Saved Phrases</h3>
            <div className="space-y-1">
              {favorites.length === 0 && <p className="px-3 text-sm text-slate-400">No favorites yet.</p>}
              {favorites.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => onHistoryClick(t)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <div className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm text-slate-600 line-clamp-1">{t.source_text}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {!profile?.is_premium && (
          <div className="p-4">
            <div className="bg-brand/5 rounded-xl p-4 border border-brand/10">
              <p className="text-xs font-semibold text-brand uppercase tracking-tight mb-1">Pro Account</p>
              <p className="text-xs text-slate-500 mb-3">
                {profile?.daily_count ?? 0} / {profile?.daily_limit ?? 500} translations used today.
              </p>
              <Link to="/pricing" className="block text-center w-full py-2 bg-brand text-white text-xs font-medium rounded-lg hover:opacity-90 transition-all">
                Upgrade Now
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-background px-8 flex items-center justify-between shrink-0">
          <nav className="flex items-center gap-1">
            <button className="px-4 py-1.5 text-sm font-medium rounded-full bg-slate-900 text-white">Translate</button>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
              <LogOut className="size-4" /> Sign out
            </button>
            <div className="size-9 rounded-full bg-slate-200 outline outline-1 -outline-offset-1 outline-black/5 grid place-items-center text-[10px] font-bold text-slate-500">
              {initials}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
            {/* Mode Switcher */}
            <div className="flex justify-center">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(["text", "voice", "image"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selector */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <LangSelect value={sourceLang} onChange={setSourceLang} options={LANGUAGES} label="Source" />
              <div className="relative">
                <button
                  onClick={swapLangs}
                  title="Swap languages"
                  className="absolute -left-5 top-1/2 -translate-y-1/2 size-8 bg-background border border-border rounded-full flex items-center justify-center text-slate-400 hover:text-brand hover:border-brand transition-colors z-10"
                >
                  <ArrowLeftRight className="size-3.5" />
                </button>
                <LangSelect value={targetLang} onChange={setTargetLang} options={TRANSLATABLE_LANGUAGES} label="Target" />
              </div>
            </div>

            {/* Mode-specific UI */}
            {mode === "text" && (
              <TextMode
                sourceText={sourceText}
                setSourceText={setSourceText}
                translated={translated}
                loading={translate.isPending}
                onTranslate={() => translate.mutate(sourceText)}
                onCopy={onCopy}
                onSpeak={() => onSpeak(translated, targetLang)}
                onSpeakSource={() => onSpeak(sourceText, sourceLang === "auto" ? "en" : sourceLang)}
                onFavorite={onFavorite}
                favorited={favorited}
                lastId={lastId}
                onClear={() => { setSourceText(""); setTranslated(""); setLastId(null); }}
              />
            )}

            {mode === "voice" && (
              <VoiceMode
                sourceLang={sourceLang}
                targetLang={targetLang}
                onTranscribed={(transcript) => {
                  setSourceText(transcript);
                  translate.mutate(transcript);
                }}
                transcribe={async (b64, mime) => transcribeFn({ data: { audioBase64: b64, mimeType: mime } })}
                sourceText={sourceText}
                translated={translated}
                onSpeak={() => onSpeak(translated, targetLang)}
              />
            )}

            {mode === "image" && (
              <ImageMode
                targetLang={targetLang}
                process={async (b64, mime) => imageFn({ data: { imageBase64: b64, mimeType: mime, targetLang } })}
                onResult={(extracted, translation) => {
                  setSourceText(extracted);
                  setTranslated(translation);
                  qc.invalidateQueries({ queryKey: ["history"] });
                }}
                sourceText={sourceText}
                translated={translated}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function LangSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: typeof LANGUAGES; label: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl shadow-xs">
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
        >
          {options.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextMode(props: {
  sourceText: string;
  setSourceText: (v: string) => void;
  translated: string;
  loading: boolean;
  onTranslate: () => void;
  onCopy: () => void;
  onSpeak: () => void;
  onSpeakSource: () => void;
  onFavorite: () => void;
  favorited: boolean;
  lastId: string | null;
  onClear: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
      <div className="bg-background rounded-2xl border border-border shadow-sm p-6 flex flex-col">
        <textarea
          value={props.sourceText}
          onChange={(e) => props.setSourceText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") props.onTranslate(); }}
          placeholder="Enter text to translate..."
          className="flex-1 w-full resize-none text-xl font-light text-slate-800 focus:outline-none placeholder:text-slate-300 bg-transparent"
          maxLength={5000}
        />
        <div className="pt-4 flex items-center justify-between border-t border-slate-50">
          <div className="flex gap-3">
            <button onClick={props.onClear} className="text-xs font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-tight">Clear</button>
            <button onClick={props.onSpeakSource} className="text-xs font-semibold text-slate-400 hover:text-slate-600 uppercase tracking-tight">Speak</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400">{props.sourceText.length} / 5000</span>
            <button
              onClick={props.onTranslate}
              disabled={!props.sourceText.trim() || props.loading}
              className="px-4 py-1.5 bg-brand text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40"
            >
              {props.loading ? "Translating…" : "Translate"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/50 rounded-2xl border border-border p-6 flex flex-col">
        <div className="flex-1">
          {props.loading ? (
            <p className="text-slate-300 italic">Translating…</p>
          ) : props.translated ? (
            <p className="text-xl font-display italic text-brand leading-relaxed">{props.translated}</p>
          ) : (
            <p className="text-slate-300">Translation will appear here.</p>
          )}
        </div>
        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
          <div className="flex gap-2">
            <IconBtn onClick={props.onCopy} title="Copy"><Copy className="size-3.5" /></IconBtn>
            <IconBtn onClick={props.onSpeak} title="Speak"><Volume2 className="size-3.5" /></IconBtn>
            <IconBtn onClick={props.onFavorite} title="Favorite" disabled={!props.lastId}>
              <Star className={`size-3.5 ${props.favorited ? "fill-amber-400 text-amber-400" : ""}`} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="size-8 rounded-lg bg-background border border-border flex items-center justify-center text-slate-600 shadow-xs hover:bg-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function VoiceMode(props: {
  sourceLang: string;
  targetLang: string;
  onTranscribed: (transcript: string) => void;
  transcribe: (b64: string, mime: string) => Promise<{ transcript: string }>;
  sourceText: string;
  translated: string;
  onSpeak: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setProcessing(true);
        try {
          const b64 = await blobToBase64(blob);
          const { transcript } = await props.transcribe(b64, blob.type);
          if (transcript) props.onTranscribed(transcript);
          else toast.error("Couldn't transcribe audio. Try again.");
        } catch (e: any) {
          toast.error(e.message ?? "Transcription failed");
        } finally {
          setProcessing(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="bg-background rounded-2xl border border-border p-12 flex flex-col items-center justify-center min-h-[400px]">
      <button
        onClick={recording ? stop : start}
        disabled={processing}
        className={`size-24 rounded-full flex items-center justify-center transition-all ${recording ? "bg-red-500 animate-pulse" : "bg-brand hover:scale-105"} text-white disabled:opacity-50`}
      >
        {recording ? <Square className="size-8 fill-white" /> : <Mic className="size-10" />}
      </button>
      <p className="mt-6 text-sm text-slate-500">
        {processing ? "Transcribing…" : recording ? "Recording — tap to stop" : "Tap to start recording"}
      </p>
      {props.sourceText && (
        <div className="mt-8 w-full max-w-2xl space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">You said</p>
            <p className="text-slate-800">{props.sourceText}</p>
          </div>
          {props.translated && (
            <div className="p-4 bg-brand/5 rounded-xl border border-brand/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand mb-1">Translation</p>
                  <p className="text-lg font-display italic text-brand">{props.translated}</p>
                </div>
                <IconBtn onClick={props.onSpeak} title="Speak"><Volume2 className="size-3.5" /></IconBtn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImageMode(props: {
  targetLang: string;
  process: (b64: string, mime: string) => Promise<{ extractedText: string; translation: string }>;
  onResult: (extracted: string, translation: string) => void;
  sourceText: string;
  translated: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image.");
    if (file.size > 8_000_000) return toast.error("Image too large (max 8MB).");
    const url = URL.createObjectURL(file);
    setPreview(url);
    setLoading(true);
    try {
      const b64 = await blobToBase64(file);
      const res = await props.process(b64, file.type);
      if (!res.extractedText) toast.error("No text found in image.");
      props.onResult(res.extractedText, res.translation);
    } catch (e: any) {
      toast.error(e.message ?? "Image translation failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
      <div className="bg-background rounded-2xl border border-border p-6 flex flex-col">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className="flex-1 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors overflow-hidden"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
          ) : (
            <>
              <Upload className="size-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Click or drop an image</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — up to 8MB</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {preview && (
          <button onClick={() => { setPreview(null); inputRef.current!.value = ""; }} className="mt-3 text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 self-start">
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      <div className="bg-slate-50/50 rounded-2xl border border-border p-6 flex flex-col">
        {loading ? (
          <p className="text-slate-300 italic">Reading image & translating…</p>
        ) : props.translated ? (
          <>
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Extracted</p>
              <p className="text-sm text-slate-600">{props.sourceText}</p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] uppercase tracking-widest text-brand mb-1">Translation</p>
              <p className="text-xl font-display italic text-brand leading-relaxed">{props.translated}</p>
            </div>
          </>
        ) : (
          <p className="text-slate-300">Upload an image to see the translation.</p>
        )}
      </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
