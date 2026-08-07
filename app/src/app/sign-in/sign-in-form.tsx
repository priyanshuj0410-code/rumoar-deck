"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Supabase's raw auth errors are written for the developer, not the person signing in.
 * The rate-limit one in particular reports a server quota to someone who only wants to get
 * in — so it names the door that is open instead.
 */
function explain(error: {
  code?: string;
  status?: number;
  message: string;
}): string {
  const code = error.code ?? "";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    error.status === 429
  )
    return "Too many sign-in emails just went out. Continue with Google below, or try the email again in a minute.";
  if (code === "validation_failed" || code === "email_address_invalid")
    return "That doesn't look like a working email address.";
  if (code === "otp_expired")
    return "That link has expired. Send yourself a fresh one.";
  if (code === "user_banned")
    return "This account is locked. Get in touch and we'll sort it.";
  if (code === "email_provider_disabled")
    return "Email sign-in is off right now. Continue with Google below.";
  return error.message;
}

/** Supabase refuses a second link to the same address inside a minute; so does this. */
const COOLDOWN = 60;

export function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

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
      setError(explain(error));
      setStatus("error");
      // A 429 means the quota is already gone; do not let them spend another attempt on it.
      if (error.status === 429 || error.code === "over_email_send_rate_limit")
        setCooldown(COOLDOWN);
    } else {
      setStatus("sent");
      setCooldown(COOLDOWN);
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
      setError(explain(error));
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="border border-line p-5">
        <p className="text-sm leading-relaxed">
          Check <b>{email}</b> for a sign-in link. It opens straight into the
          app.
        </p>
        <button
          className="btn btn-ghost btn-sm mt-4"
          onClick={() => setStatus("idle")}
        >
          Use a different email
        </button>
        {cooldown > 0 && (
          <p className="text-[12px] text-mute mt-3">
            Nothing yet? You can send another in {cooldown}s — or use Google,
            which is instant.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Google leads. It is the path that cannot run out of quota, and putting the
          fragile one first was sending most people through the narrowest door. */}
      <button className="btn w-full" onClick={() => oauth("google")}>
        <span className="mi text-[19px]" aria-hidden>
          person
        </span>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-6">
        <span className="h-px bg-line flex-1" />
        <span className="k">or</span>
        <span className="h-px bg-line flex-1" />
      </div>

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
        <button
          className="btn btn-ghost w-full"
          disabled={status === "sending" || cooldown > 0}
        >
          {status === "sending"
            ? "Sending…"
            : cooldown > 0
              ? `Try again in ${cooldown}s`
              : "Email me a link"}
        </button>
      </form>

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
