import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const STUDENT_PREFIXES = ['/dashboard', '/practice', '/mock', '/cbt', '/challenge', '/millionaire', '/results', '/profile', '/settings', '/class-notes', '/subjects', '/progress', '/leaderboard', '/community'];
const PROTECTED_PREFIXES = ['/practice', '/mock', '/cbt', '/challenge', '/millionaire', '/class-notes', '/subjects'];
const PROTECTED_API_PREFIXES = ['/api/exams', '/api/class-notes'];
const ADMIN_PREFIX = '/admin';
const ACTIVATION_ONLY_AT = new Date('2026-10-01T00:00:00+01:00');

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith(ADMIN_PREFIX);
  const isStudentRoute = STUDENT_PREFIXES.some((p) => path.startsWith(p));
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => path.startsWith(p));

  if (!user && (isAdminRoute || isStudentRoute || isProtectedApi)) {
    if (isProtectedApi) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  if (user && (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) || isProtectedApi) && new Date() >= ACTIVATION_ONLY_AT) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (profile) {
      const { data: activationAccess } = await supabase
        .from('student_access')
        .select('access_key_id, access_keys!inner(key_type, status, is_active)')
        .eq('profile_id', profile.id)
        .eq('access_type', 'activation_key')
        .eq('access_keys.status', 'used')
        .eq('access_keys.is_active', true)
        .limit(1);
      if (!activationAccess?.length) {
        if (isProtectedApi) return NextResponse.json({ error: 'Activation Key required.' }, { status: 403 });
        const redirectUrl = new URL('/dashboard', request.url);
        redirectUrl.searchParams.set('access', 'activation-required');
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/practice/:path*', '/mock/:path*', '/cbt/:path*', '/challenge/:path*', '/millionaire/:path*', '/results/:path*', '/profile/:path*', '/settings/:path*', '/class-notes/:path*', '/subjects/:path*', '/progress/:path*', '/leaderboard/:path*', '/community/:path*', '/api/exams/:path*', '/api/class-notes/:path*', '/admin/:path*'],
};
