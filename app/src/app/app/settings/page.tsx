import { getProfile, getUser } from "@/lib/data";
import { NotificationToggle } from "@/components/notification-toggle";

export const metadata = { title: "Settings — RUMOAR" };

export default async function SettingsPage() {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);

  return (
    <div className="px-4 mx-auto @lg:px-6 @4xl:px-10 py-6 @4xl:py-10 max-w-[620px]">
      <p className="k">Settings</p>
      <h1 className="text-[26px] mt-1">Your account</h1>

      <dl className="mt-8 border-t border-line">
        <div className="flex justify-between gap-6 py-4 border-b border-line">
          <dt className="text-mute text-sm">Name</dt>
          <dd className="text-sm">{profile?.display_name ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-6 py-4 border-b border-line">
          <dt className="text-mute text-sm">Email</dt>
          <dd className="text-sm break-all">{user?.email ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-6 py-4 border-b border-line">
          <dt className="text-mute text-sm">Season</dt>
          <dd className="text-sm text-right">{profile?.analysis?.season ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-6 py-4 border-b border-line">
          <dt className="text-mute text-sm">Colouring</dt>
          <dd className="text-sm text-right">
            {profile?.analysis
              ? `${profile.analysis.undertone} · ${profile.analysis.depth} · ${profile.analysis.contrast} contrast`
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-6 py-4 border-b border-line">
          <dt className="text-mute text-sm">Metals</dt>
          <dd className="text-sm text-right">{profile?.analysis?.metals ?? "—"}</dd>
        </div>
      </dl>

      {profile?.analysis?.best_colours?.length ? (
        <section className="mt-8">
          <h2 className="k">Your colours</h2>
          <ul className="grid grid-cols-4 gap-2 mt-3">
            {profile.analysis.best_colours.map((colour) => (
              <li key={colour.hex}>
                <span
                  className="block aspect-square"
                  style={{
                    background: colour.hex,
                    boxShadow: "inset 0 0 0 1px rgba(23,23,27,0.16)",
                  }}
                  role="img"
                  aria-label={colour.name}
                />
                <span className="text-[11px] leading-tight block mt-1">{colour.name}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-mute leading-snug mt-3">
            Read from your intake photos
            {profile.analysed_at
              ? ` on ${new Date(profile.analysed_at).toLocaleDateString("en-IN")}`
              : ""}
            . Lighting affects this — treat it as a strong starting point, not a verdict.
          </p>
        </section>
      ) : null}

      <NotificationToggle />

      <form action="/auth/sign-out" method="post" className="mt-10">
        <button className="btn btn-ghost w-full">Sign out</button>
      </form>
    </div>
  );
}
