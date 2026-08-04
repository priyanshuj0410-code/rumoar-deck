export const metadata = { title: "Offline — RUMOAR" };

export default function OfflinePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <span className="mi text-[34px] text-mute" aria-hidden>
        cloud_off
      </span>
      <h1 className="text-[26px] mt-4">You&rsquo;re offline</h1>
      <p className="text-mute text-sm leading-relaxed mt-3 max-w-[300px]">
        Your wardrobe is saved. Reconnect and everything picks up where it left off.
      </p>
    </main>
  );
}
