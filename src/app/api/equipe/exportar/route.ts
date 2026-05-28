import { NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ENTREGADOR: 'Entregador',
};

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
  });

  const header = ['nome', 'email', 'nivel de acesso', 'situacao', 'criado em'];
  const rows = users.map((user) => [
    user.name,
    user.email,
    roleLabels[user.role] ?? user.role,
    user.isActive ? 'ativo' : 'inativo',
    user.createdAt.toLocaleDateString('pt-BR'),
  ]);

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n');

  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="equipe-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
