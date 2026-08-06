import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // The landing page is static HTML in public/. A next.config rewrite serves it
  // correctly under `next start` but not on Vercel, whose router resolves "/" against
  // the app routes first and 404s. Middleware runs on every matched request, so the
  // rewrite here is the one that actually holds in both places.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/landing.html", request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|mp3)$).*)"],
};
