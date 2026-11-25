import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_SITE } from "@/lib/public-site";

// On the public site the dashboard isn't there: its pages explain where it runs, and its API refuses.
export function middleware(req: NextRequest) {
  if (!PUBLIC_SITE) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "The CheckoutGuard runner only works on your own machine." }, { status: 404 });
  return NextResponse.redirect(new URL("/local", req.url));
}

export const config = { matcher: ["/app/:path*", "/runs/:path*", "/repairs/:path*", "/api/:path*"] };
