"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

/**
 * The states a surface can be in, as components, so every screen answers them the same
 * way. See knowledge/design.md § States.
 */

/** Nothing yet — and always a way out of it. An empty screen with no action is a wall. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 max-w-[34ch] mx-auto">
      <span className="mi text-[30px] text-mute" aria-hidden>
        {icon}
      </span>
      <p className="text-[17px] mt-4">{title}</p>
      <p className="text-mute text-sm leading-relaxed mt-2">{body}</p>
      {action && (
        <Link href={action.href} className="btn btn-sm mt-5">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** A shimmering block that holds the shape of what is coming. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skel block ${className}`} aria-hidden />;
}

/**
 * A form button that knows the submit is in flight.
 *
 * Server-action forms otherwise look inert between the tap and the re-render — on a slow
 * connection that is long enough to tap twice.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || rest.disabled}
      aria-busy={pending}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** The icon-button flavour: the glyph dims and stops accepting taps while in flight. */
export function IconSubmit({
  glyph,
  label,
  active = false,
  className = "",
}: {
  glyph: string;
  label: string;
  active?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      aria-pressed={active}
      aria-busy={pending}
      disabled={pending}
      className={`transition-all duration-200 ${pending ? "opacity-40 scale-95" : "active:scale-90"} ${className}`}
    >
      <span
        className="mi text-[17px]"
        style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 300, 'opsz' 24` }}
        aria-hidden
      >
        {glyph}
      </span>
    </button>
  );
}
