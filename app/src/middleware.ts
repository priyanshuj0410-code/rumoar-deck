import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // The landing page is static HTML in public/, and the two runtimes disagree on its
  // path: Vercel serves it with the extension stripped (/landing), a local `next start`
  // only at the literal /landing.html. A config rewrite cannot bridge that — pointing
  // /landing at /landing.html on Vercel breaks the one path that did work. So each
  // environment is simply told the truth about itself.
  if (request.nextUrl.pathname === "/") {
    const landing = process.env.VERCEL ? "/landing" : "/landing.html";
    return NextResponse.rewrite(new URL(landing, request.url));
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|mp3)$).*)"],
};
