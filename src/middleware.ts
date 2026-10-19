import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth", "/reset-password", "/set-password", "/api/health"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
  let response = NextResponse.next({ request });

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) {
    // Misconfigured deployment: let public pages render so /api/health can explain; everything else goes to login.
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Refreshes the session cookie if it expired. Do not remove.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !isPublic) {
      const to = request.nextUrl.clone();
      to.pathname = "/login";
      to.search = "";
      to.searchParams.set("next", path);
      return NextResponse.redirect(to);
    }
    if (user && path === "/login") {
      const to = request.nextUrl.clone();
      to.pathname = "/";
      to.search = "";
      return NextResponse.redirect(to);
    }
    return response;
  } catch (e) {
    console.error("middleware error", e);
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login?error=middleware", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
