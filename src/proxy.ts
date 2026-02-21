import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const BASE_PATH = "/job-navigator";

export async function proxy(request: NextRequest) {
  const fullPath = request.nextUrl.pathname;
  // basePath를 제거하여 실제 라우트 경로만 추출
  const path = fullPath.startsWith(BASE_PATH)
    ? fullPath.slice(BASE_PATH.length) || "/"
    : fullPath;

  let response = NextResponse.next({
    request: { headers: request.headers },
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 경로: 로그인 필요
  const protectedPaths = ["/student", "/teacher", "/dashboard", "/profile"];
  const isProtected = protectedPaths.some((prefix) => path.startsWith(prefix));

  if (isProtected && !user) {
    return NextResponse.redirect(new URL(BASE_PATH + "/auth", request.nextUrl));
  }

  // 인증 페이지: 이미 로그인 상태면 역할별 대시보드로
  const authPaths = ["/login", "/signup", "/auth"];
  const isAuthPage = authPaths.some((prefix) => path.startsWith(prefix));

  if (isAuthPage && user) {
    const role = user.user_metadata?.role || "student";
    const target = role === "teacher" ? "/teacher" : "/student";
    return NextResponse.redirect(new URL(BASE_PATH + target, request.nextUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
