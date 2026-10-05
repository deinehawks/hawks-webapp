import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { assertRecordingEnvironment } from "@/lib/recording/config";

export async function updateSession(request: NextRequest) {
  assertRecordingEnvironment();
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/internal/asset-auth" &&
    request.nextUrl.pathname !== "/asimov-hawks/internal/asset-auth" &&
    request.nextUrl.pathname !== "/"
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",", 1)[0]
      .trim();

    if (forwardedHost) {
      try {
        const forwardedUrl = new URL(`http://${forwardedHost}`);
        const isLoopbackHost =
          forwardedUrl.hostname === "127.0.0.1" ||
          forwardedUrl.hostname === "localhost";
        const isRecordingPort =
          forwardedUrl.port === "8082" || forwardedUrl.port === "3200";

        if (isLoopbackHost && isRecordingPort) {
          url.protocol = "http:";
          url.hostname = forwardedUrl.hostname;
          url.port = forwardedUrl.port;
        }
      } catch {
        // Ignore malformed/untrusted forwarded hosts and retain Next's origin.
      }
    }

    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
