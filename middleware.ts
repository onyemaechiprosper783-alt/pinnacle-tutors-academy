import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const STUDENT_PREFIXES = [
  '/dashboard', '/practice', '/mock', '/cbt', '/challenge',
  '/millionaire', '/results', '/profile', '/settings',
];
const ADMIN_PREFIX = '/admin';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith(ADMIN_PREFIX);
  const isStudentRoute = STUDENT_PREFIXES.some((p) => path.startsWith(p));

  if (!user && (isAdminRoute || isStudentRoute)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute && user) {
    // Role check happens against the database, never against a client-
    // supplied cookie/header — a student cannot spoof their way in here.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/practice/:path*', '/mock/:path*', '/cbt/:path*',
    '/challenge/:path*', '/millionaire/:path*', '/results/:path*',
    '/profile/:path*', '/settings/:path*', '/admin/:path*',
  ],
};
