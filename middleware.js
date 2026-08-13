import { NextResponse } from "next/server";

// Routes that require an authenticated user (checked via the ocass-token cookie).
const protectedRoutes = ["/ecommerce/checkout"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    // The browser calls same-origin /api/*, proxied here to the backend -
    // this avoids CORS and keeps the backend's real URL as a server-only
    // env var (BACKEND_URL) instead of a NEXT_PUBLIC_ value baked into the
    // client bundle. Deliberately done in middleware, not next.config.js's
    // rewrites() - Next.js resolves rewrites() once at `next build` time
    // and freezes the destination into .next/routes-manifest.json, so on
    // a platform where BACKEND_URL is only set as a runtime env var on the
    // deployed service (Render, Cloud Run) and isn't available during the
    // Docker build step, rewrites() would permanently bake in whatever
    // BACKEND_URL happened to resolve to at build time (its fallback,
    // usually) no matter what's set in the dashboard afterward. Middleware
    // runs per-request, so process.env.BACKEND_URL is read fresh every
    // time - this is what actually makes it runtime-configurable.
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const destination = new URL(`${pathname}${request.nextUrl.search}`, backendUrl);
    return NextResponse.rewrite(destination);
  }

  if (protectedRoutes.includes(pathname)) {
    const token = request.cookies.get("ocass-token");
    if (!token?.value) {
      const url = new URL("/auth/login", request.url);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/ecommerce/checkout", "/api/:path*"],
};
