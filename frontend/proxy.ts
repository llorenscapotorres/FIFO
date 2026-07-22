import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session_token";
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  // In production the frontend and backend live on different Render
  // subdomains, which are different *sites* for cookie purposes (no
  // SameSite cookie would cross them). Proxying /api/* through the
  // frontend's own origin keeps every browser request same-origin, so the
  // session cookie always works regardless of where the backend runs.
  //
  // This has to happen here (evaluated per-request) rather than via
  // next.config.js's rewrites(), which gets baked into a manifest at
  // `next build` time -- baking in BACKEND_URL there would require it to
  // be known at image build time, not just at container runtime.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      const target = new URL(request.nextUrl.pathname + request.nextUrl.search, backendUrl);
      return NextResponse.rewrite(target);
    }
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const isAuthPage = AUTH_PAGES.includes(request.nextUrl.pathname);

  if (!hasSession && !isAuthPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
