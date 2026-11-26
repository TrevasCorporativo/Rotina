import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawName = String(body?.name ?? '').trim();
    const password = String(body?.password ?? '');

    if (!rawName || !password) {
      return NextResponse.json(
        { error: 'Informe seu nome e sua senha.' },
        { status: 400 }
      );
    }

    const normalized = rawName.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
    const admin = createAdminClient();

    // Look up user email by login_key (name) or direct email
    const { data: profile, error: lookupError } = await admin
      .from('profiles')
      .select('email, display_name')
      .or(`login_key.eq.${normalized},email.eq.${normalized}`)
      .maybeSingle();

    if (lookupError || !profile) {
      return NextResponse.json(
        { error: 'Nome não encontrado. Confira como você digitou.' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInError || !data.user) {
      return NextResponse.json(
        { error: 'Senha incorreta. Respira e tenta mais uma vez.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        display_name: profile.display_name,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível entrar agora. Tente novamente.' },
      { status: 500 }
    );
  }
}

