import Link from "next/link";
import { redirect } from "next/navigation";
import { ToastProvider } from "@/components/toast";
import { getProfile } from "@/lib/data";
import { Controls } from "./controls";
import { Sheet } from "./sheet";
import "./print.css";

export const metadata = { title: "Your report — RUMOAR" };

export default async function ReportPage() {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in?next=%2Freport");
  if (!profile.analysis) redirect("/onboarding");

  return (
    <ToastProvider>
      <main className="min-h-dvh px-5 lg:px-10 py-6 lg:py-10 max-w-[1000px] mx-auto">
        <div className="no-print">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink transition-colors"
          >
            <span className="mi text-[20px]" aria-hidden>
              arrow_back
            </span>
            Back
          </Link>
          <p className="k mt-5">Take it with you</p>
          <h1 className="text-[28px] lg:text-[38px] mt-2">
            Your reading, on one page.
          </h1>
          <p className="text-mute text-sm lg:text-[15px] leading-relaxed mt-2 max-w-[52ch]">
            Everything that changes what you buy, on a single side of A4 — the
            palette at a size worth holding against cloth, and the fit rules
            that go with it.
          </p>
          <Controls analysis={profile.analysis} name={profile.display_name} />
        </div>

        <div className="frame mt-8">
          <Sheet profile={profile} analysis={profile.analysis} />
        </div>
      </main>
    </ToastProvider>
  );
}
