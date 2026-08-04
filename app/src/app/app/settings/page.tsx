import { getProfile, getUser } from "@/lib/data";
import { NotificationToggle } from "@/components/notification-toggle";

export const metadata = { title: "Settings — RUMOAR" };

export default async function SettingsPage() {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);

  return (
    <div className="px-4 sm:px-6 xl:px-8 py-6 max-w-[560px]">
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
          <dt className="text-mute text-sm">Style</dt>
          <dd className="text-sm text-right">{profile?.vibe ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-6 py-4 border-b border-line">
          <dt className="text-mute text-sm">Dresses for</dt>
          <dd className="text-sm text-right">
            {profile?.occasions?.length ? profile.occasions.join(", ") : "—"}
          </dd>
        </div>
      </dl>

      <NotificationToggle />

      <form action="/auth/sign-out" method="post" className="mt-10">
        <button className="btn btn-ghost w-full">Sign out</button>
      </form>
    </div>
  );
}
