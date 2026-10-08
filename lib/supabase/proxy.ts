import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Me-refresh sesi auth admin di setiap request supaya cookie tidak kedaluwarsa.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Jangan taruh kode apa pun di antara createServerClient dan getClaims().
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = !!data?.claims;

  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginPage = pathname === "/admin/login";

  // Belum login: semua /admin/* (kecuali halaman login) dilempar ke login.
  if (isAdminRoute && !isLoginPage && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  // Sudah login tapi buka halaman login: langsung ke dashboard.
  if (isLoginPage && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

// Redirect sambil membawa cookie sesi yang mungkin baru di-refresh.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
