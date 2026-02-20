import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { publicKey, signingPublicKey } = body;

    if (!publicKey || typeof publicKey !== 'string' || publicKey.length > 4096) {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }

    const keyData = JSON.stringify({
      encryption: publicKey,
      signing: signingPublicKey || null,
      version: 2,
    });

    const { error: updateError } = await getSupabaseAdmin()
      .from('profiles')
      .update({ public_key: keyData })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating public key:', updateError);
      return NextResponse.json({ error: 'Failed to update public key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in PUT /api/profile/public-key:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get('userId') || user.id;

    const { data: profile, error: fetchError } = await getSupabaseAdmin()
      .from('profiles')
      .select('public_key')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const raw = profile.public_key;
    if (!raw) {
      return NextResponse.json({ publicKey: null, signingPublicKey: null });
    }

    // Support both v1 (plain base64 string) and v2 (JSON with encryption + signing)
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version === 2) {
        return NextResponse.json({
          publicKey: parsed.encryption,
          signingPublicKey: parsed.signing || null,
        });
      }
    } catch {
      // v1 format: raw is the encryption key directly
    }

    return NextResponse.json({ publicKey: raw, signingPublicKey: null });
  } catch (err) {
    console.error('Unexpected error in GET /api/profile/public-key:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
