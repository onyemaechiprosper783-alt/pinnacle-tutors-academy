import { NextResponse } from 'next/server';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // base64url -> base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET() {
  const EXPECTED_REF = 'ydmanekmbjwdtdrfsbrq';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  let hostname: string | null = null;
  try {
    hostname = url ? new URL(url).hostname : null;
  } catch {
    hostname = null;
  }

  if (!serviceKey) {
    return NextResponse.json(
      {
        supabaseUrlHostname: hostname,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set in this deployment.',
      },
      { status: 500 }
    );
  }

  const payload = decodeJwtPayload(serviceKey);

  if (!payload) {
    return NextResponse.json(
      {
        supabaseUrlHostname: hostname,
        error: 'Could not decode SUPABASE_SERVICE_ROLE_KEY as a JWT.',
      },
      { status: 500 }
    );
  }

  const ref = typeof payload.ref === 'string' ? payload.ref : null;
  const role = typeof payload.role === 'string' ? payload.role : null;
  const iss = typeof payload.iss === 'string' ? payload.iss : null;

  return NextResponse.json({
    supabaseUrlHostname: hostname,
    jwtRef: ref,
    jwtRole: role,
    jwtIss: iss,
    refMatchesExpected: ref === EXPECTED_REF,
  });
                                                        }
