import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in — RUMOAR" };

export default async function SignInPage() {
  if (await getUser()) redirect("/app");

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[380px]">
        <Link href="/" className="k">
          RUMOAR
        </Link>
        <h1 className="text-[32px] mt-4 leading-[1.1]">Your stylist, always on.</h1>
        <p className="text-mute text-sm leading-relaxed mt-3 mb-8">
          Sign in and your wardrobe follows you — phone, laptop, anywhere.
        </p>

        <Suspense fallback={<div className="h-[52px] skel" />}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
