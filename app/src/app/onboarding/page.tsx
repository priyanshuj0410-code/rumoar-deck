import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Welcome — RUMOAR" };

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");
  if (profile.onboarding_stage === "done") redirect("/app");

  return <Onboarding profile={profile} />;
}
