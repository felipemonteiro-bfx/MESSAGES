import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, getApiErrorMessage } from '@/lib/supabase/admin';

export const dynamic = 'force-static';
export const revalidate = 0;

/** Escapa _ e % para uso em ILIKE (match exato) */
function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * GET /api/users/find?nickname=xxx ou ?email=xxx
 * Busca usuário por nickname ou email. Usa service role para evitar RLS.
 * Retorna { id, nickname, avatar_url } ou 404.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get('nickname')?.trim();
    const email = searchParams.get('email')?.trim();

    if (!nickname && !email) {
      return NextResponse.json(
        { error: 'Informe nickname ou email (query: ?nickname=xxx ou ?email=xxx)' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    let target: { id: string; nickname: string; avatar_url: string | null } | null = null;

    if (email) {
      const { data: rows, error } = await admin.rpc('get_user_by_email', {
        user_email: email
      });

      if (error) {
        console.error('RPC get_user_by_email error:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar usuário por email' },
          { status: 500 }
        );
      }

      const first = Array.isArray(rows) ? rows[0] : rows;
      if (first && typeof first?.id === 'string') {
        target = {
          id: first.id,
          nickname: first.nickname ?? '',
          avatar_url: first.avatar_url ?? null
        };
      }
    } else if (nickname) {
      const { data: rows, error } = await admin
        .from('profiles')
        .select('id, nickname, avatar_url')
        .ilike('nickname', escapeIlike(nickname))
        .limit(1);

      if (error) {
        console.error('profiles lookup error:', error);
        return NextResponse.json(
          { error: 'Erro ao buscar usuário' },
          { status: 500 }
        );
      }

      const profile = Array.isArray(rows) ? rows[0] : rows;
      if (profile) {
        target = {
          id: profile.id,
          nickname: profile.nickname ?? '',
          avatar_url: profile.avatar_url ?? null
        };
      }
    }

    if (!target) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (target.id === user.id) {
      return NextResponse.json(
        { error: 'Você não pode buscar a si mesmo' },
        { status: 400 }
      );
    }

    return NextResponse.json(target);
  } catch (err) {
    console.error('Unexpected error in /api/users/find:', err);
    return NextResponse.json({ error: getApiErrorMessage(err) }, { status: 500 });
  }
}
