import { NextResponse } from "next/server";

// Routes that require an authenticated user (checked via the ocass-token cookie).
const protectedRoutes = ["/ecommerce/checkout"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/ecommerce/checkout"],
};
