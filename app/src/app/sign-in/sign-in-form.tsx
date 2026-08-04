"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function oauth(provider: "google" | "apple") {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="border border-line p-5">
        <p className="text-sm leading-relaxed">
          Check <b>{email}</b> for a sign-in link. It opens straight into the app.
        </p>
        <button className="btn btn-ghost btn-sm mt-4" onClick={() => setStatus("idle")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={sendLink} className="flex flex-col gap-3">
        <label htmlFor="email" className="k">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="field"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn w-full" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Email me a link"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <span className="h-px bg-line flex-1" />
        <span className="k">or</span>
        <span className="h-px bg-line flex-1" />
      </div>

      <div className="flex flex-col gap-3">
        <button className="btn btn-ghost w-full" onClick={() => oauth("google")}>
          Continue with Google
        </button>
        <button className="btn btn-ghost w-full" onClick={() => oauth("apple")}>
          Continue with Apple
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm mt-5 flex items-start gap-2">
          <span className="mi text-[18px]" aria-hidden>
            error
          </span>
          {error}
        </p>
      )}
    </div>
  );
}
