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

  const { data, error } = await supabase
    .from('student_access')
    .select('access_type, granted_at, expires_at')
    .eq('profile_id', user.id)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function hasActiveStudentAccess(): Promise<boolean> {
  const access = await getStudentAccess();

  if (!access) return false;

  // Activation Keys do not expire.
  if (access.access_type === 'activation_key') {
    return true;
  }

  // Product Keys expire.
  if (access.access_type === 'product_key') {
    if (!access.expires_at) return false;

    return new Date(access.expires_at).getTime() > Date.now();
  }

  return false;
}
