import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.webp";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Delight Lingua" },
      { name: "description", content: "Simple pricing. Free forever, premium for unlimited translations." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-ui-bg">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display italic text-2xl text-brand">
            <img src={logo} alt="Delight Lingua" className="h-8 w-8 rounded-md object-cover" />
            <span>Delight Lingua</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link to="/signup" className="px-4 py-2 text-sm font-medium rounded-full bg-slate-900 text-white">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="font-display text-5xl md:text-6xl text-slate-900 tracking-tight">
            Pricing as <span className="italic text-brand">simple</span> as words.
          </h1>
          <p className="mt-4 text-slate-500">Start free. Upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PlanCard
            name="Free"
            price="$0"
            period="forever"
            features={[
              "500 translations per day",
              "Text translation",
              "50+ languages",
              "Translation history",
              "Save favorites",
            ]}
            cta="Get started"
            ctaTo="/signup"
            highlight={false}
          />
          <PlanCard
            name="Pro"
            price="$9"
            period="per month"
            features={[
              "Unlimited translations",
              "Text, voice & image modes",
              "Priority AI processing",
              "Export translation history",
              "Premium support",
            ]}
            cta="Upgrade to Pro"
            ctaTo="/signup"
            highlight={true}
            onCta={() => toast.info("Premium checkout coming soon — sign up to be notified.")}
          />
        </div>
      </main>
    </div>
  );
}

function PlanCard({
  name, price, period, features, cta, ctaTo, highlight, onCta,
}: {
  name: string; price: string; period: string; features: string[]; cta: string; ctaTo: string; highlight: boolean; onCta?: () => void;
}) {
  return (
    <div className={`rounded-2xl p-8 ${highlight ? "bg-slate-900 text-white" : "bg-background border border-border"}`}>
      <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${highlight ? "text-brand" : "text-slate-500"}`}>{name}</h3>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-5xl">{price}</span>
        <span className={`text-sm ${highlight ? "text-slate-400" : "text-slate-500"}`}>{period}</span>
      </div>
      <ul className={`mt-6 space-y-3 ${highlight ? "text-slate-300" : "text-slate-600"}`}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className={`size-4 mt-0.5 shrink-0 ${highlight ? "text-brand" : "text-brand"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {onCta ? (
        <button onClick={onCta} className={`mt-8 w-full py-2.5 rounded-lg text-sm font-medium ${highlight ? "bg-brand text-white hover:opacity-90" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
          {cta}
        </button>
      ) : (
        <Link to={ctaTo} className={`mt-8 block text-center py-2.5 rounded-lg text-sm font-medium ${highlight ? "bg-brand text-white hover:opacity-90" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
          {cta}
        </Link>
      )}
    </div>
  );
}
