'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function AuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;

      // Only redirect from public/auth entry pages. Never interrupt a
      // student who is already inside the app.
      if (pathname !== '/' && pathname !== '/login') return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!mounted) return;

      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/dashboard');
      }
    };

    restore().catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted || !nextSession?.user) return;
      if (pathname !== '/' && pathname !== '/login') return;
      router.replace('/dashboard');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
