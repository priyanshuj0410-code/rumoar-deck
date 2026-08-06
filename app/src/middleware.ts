import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // The landing page is static HTML in public/. Vercel serves it with the extension
  // stripped (/landing); `next start` serves it only at its literal path. Rewriting to
  // the extensionless form and mapping that to the file in next.config makes one target
  // correct in both.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/landing", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|mp3)$).*)"],
};
