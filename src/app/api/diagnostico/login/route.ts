import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const DIAGNOSTIC_TOKEN = 'gasparzinho-check';
const DEFAULT_DATABASE_SCHEMA = 'gasparzinho_v2_dev';

function getConfiguredSchema() {
  const url = process.env.DATABASE_URL;
  if (!url) return DEFAULT_DATABASE_SCHEMA;

  const schema = new URL(url).searchParams.get('schema');
  if (!schema || schema === 'public') return DEFAULT_DATABASE_SCHEMA;

  return schema;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('token') !== DIAGNOSTIC_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Acesso negado.' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@gasparzinho.com' },
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
        password: true,
      },
    });

    return NextResponse.json({
      ok: true,
      schema: getConfiguredSchema(),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasDirectUrl: Boolean(process.env.DIRECT_URL),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      adminFound: Boolean(user),
      adminActive: user?.isActive ?? false,
      adminRole: user?.role ?? null,
      adminPasswordOk: user ? await bcrypt.compare('admin123', user.password) : false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        schema: getConfiguredSchema(),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasDirectUrl: Boolean(process.env.DIRECT_URL),
        hasAuthSecret: Boolean(process.env.AUTH_SECRET),
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        error: error instanceof Error ? error.message : 'Erro desconhecido.',
      },
      { status: 500 },
    );
  }
}
