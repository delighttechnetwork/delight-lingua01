import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { AuthShell, Input, Divider, GoogleIcon } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Delight Lingua" },
      { name: "description", content: "Create your Delight Lingua account to start translating instantly." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: window.location.origin + "/app",
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Check your inbox to verify your email.");
    navigate({ to: "/login" });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  };

  return (
    <AuthShell title="Create your account" subtitle="Start translating in seconds.">
      <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-accent">
        <GoogleIcon /> Continue with Google
      </button>
      <Divider />
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 chars)" required minLength={6} />
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account? <Link to="/login" className="text-brand font-medium">Sign in</Link>
      </p>
    </AuthShell>
  );
}
