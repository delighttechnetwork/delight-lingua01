import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Languages, Mic, Camera, Sparkles } from "lucide-react";
import logo from "@/assets/logo.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delight Lingua — Instant Translation for Text, Voice & Images" },
      { name: "description", content: "Translate text, speech, and images across 50+ languages with delightful accuracy. Free to start." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-ui-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 font-display italic text-xl sm:text-2xl text-brand shrink-0">
            <img src={logo} alt="Delight Lingua" className="h-8 w-8 rounded-md object-cover" />
            <span>Delight Lingua</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link to="/pricing" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link to="/login" className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link to="/signup" className="px-3 sm:px-4 py-2 text-sm font-medium rounded-full bg-slate-900 text-white hover:bg-slate-800">Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand uppercase tracking-wider mb-8">
            <Sparkles className="size-3" /> AI-powered translation
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl text-slate-900 leading-[1.05] tracking-tight text-balance">
            Translate <span className="italic text-brand">anything</span>,<br />in any language.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto text-pretty leading-relaxed">
            Type, speak, or snap a photo. Delight Lingua turns words across 50+ languages with natural, context-aware accuracy.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
              Start translating free <ArrowRight className="size-4" />
            </Link>
            <Link to="/pricing" className="px-6 py-3 rounded-full border border-border bg-background text-sm font-medium hover:bg-accent transition-colors text-center">
              See pricing
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FeatureCard icon={<Languages className="size-5" />} title="Text translation" desc="Auto-detect any source language and translate into 50+ targets in under a second." />
            <FeatureCard icon={<Mic className="size-5" />} title="Voice translation" desc="Speak naturally. Get accurate transcripts and translations with audio playback." />
            <FeatureCard icon={<Camera className="size-5" />} title="Image translation" desc="Snap a menu, sign, or document. Extract text and translate instantly." />
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight">
            Ready when you <span className="italic text-brand">are</span>.
          </h2>
          <p className="mt-4 text-slate-500 text-pretty">500 free translations per day. Upgrade anytime for unlimited.</p>
          <Link to="/signup" className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
            Create your account <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© 2026 Delight Lingua</span>
          <div className="flex gap-6">
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-background rounded-2xl border border-border p-6">
      <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
