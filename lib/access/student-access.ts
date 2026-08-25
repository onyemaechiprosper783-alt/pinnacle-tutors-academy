import { createClient } from '@/lib/supabase/server';

export type StudentAccess = {
  access_type: string;
  granted_at: string;
  expires_at: string | null;
};

export async function getStudentAccess(): Promise<StudentAccess | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const now = new Date().toISOString();

  // First look for an active, non-expired Activation Key.
  const { data: activationAccess } = await supabase
    .from('student_access')
    .select('access_type, granted_at, expires_at')
    .eq('profile_id', user.id)
    .eq('access_type', 'activation_key')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activationAccess) {
    return activationAccess;
  }

  // If there is no active Activation Key,
  // look for an active Product Key.
  const { data: productAccess } = await supabase
    .from('student_access')
    .select('access_type, granted_at, expires_at')
    .eq('profile_id', user.id)
    .eq('access_type', 'product_key')
    .gt('expires_at', now)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return productAccess ?? null;
}

export async function hasActiveStudentAccess(): Promise<boolean> {
  const access = await getStudentAccess();

  if (!access) return false;

  // Activation Key with no expiry = permanent access.
  if (access.access_type === 'activation_key') {
    return !access.expires_at || new Date(access.expires_at).getTime() > Date.now();
  }

  // Product Key must have a future expiry date.
  if (access.access_type === 'product_key') {
    if (!access.expires_at) return false;

    return new Date(access.expires_at).getTime() > Date.now();
  }

  return false;
}
