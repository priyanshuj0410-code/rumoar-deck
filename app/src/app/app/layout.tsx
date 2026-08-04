import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Stylist } from "@/components/stylist";
import { InstallPrompt } from "@/components/install-prompt";
import { createClient } from "@/lib/supabase/server";
import { catalogUrl, getProfile } from "@/lib/data";
import type { Message, Product } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");
  if (profile.onboarding_stage !== "done") redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: messages }, { data: products }] = await Promise.all([
    supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(80),
    supabase.from("products").select("*").eq("active", true),
  ]);

  const bySlug = Object.fromEntries(
    ((products ?? []) as Product[]).map((product) => [
      product.slug,
      { ...product, imageUrl: catalogUrl(product.image_path) },
    ]),
  );

  return (
    <>
      <AppShell
        stylist={
          <Stylist
            initialMessages={(messages ?? []) as Message[]}
            products={bySlug}
            name={profile.display_name}
          />
        }
      >
        {children}
      </AppShell>
      <InstallPrompt />
    </>
  );
}
