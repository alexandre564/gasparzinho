import { NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function backupReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}

async function optionalFindMany<T>(callback: () => Promise<T[]>): Promise<T[]> {
  try {
    return await callback();
  } catch {
    return [];
  }
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const [
    users,
    customers,
    products,
    inventoryMovements,
    butaneCylinders,
    orders,
    deliveries,
    debts,
    expenses,
    vehicles,
    dailyClosings,
    systemSettings,
    organizations,
    branches,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.customer.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.product.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.inventoryMovement.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.butaneCylinder.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    }),
    prisma.delivery.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.debt.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.expense.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.vehicle.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.dailyClosing.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.systemSetting.findMany({ orderBy: { key: 'asc' } }),
    optionalFindMany(() => prisma.organization.findMany({ orderBy: { createdAt: 'asc' } })),
    optionalFindMany(() => prisma.branch.findMany({ orderBy: { createdAt: 'asc' } })),
  ]);

  const exportedAt = new Date();
  const backup = {
    app: 'gasparzinho',
    version: 1,
    exportedAt: exportedAt.toISOString(),
    counts: {
      users: users.length,
      customers: customers.length,
      products: products.length,
      inventoryMovements: inventoryMovements.length,
      butaneCylinders: butaneCylinders.length,
      orders: orders.length,
      deliveries: deliveries.length,
      debts: debts.length,
      expenses: expenses.length,
      vehicles: vehicles.length,
      dailyClosings: dailyClosings.length,
      systemSettings: systemSettings.length,
      organizations: organizations.length,
      branches: branches.length,
    },
    data: {
      users,
      customers,
      products,
      inventoryMovements,
      butaneCylinders,
      orders,
      deliveries,
      debts,
      expenses,
      vehicles,
      dailyClosings,
      systemSettings,
      organizations,
      branches,
    },
  };

  const dateName = exportedAt.toISOString().slice(0, 10);
  const body = JSON.stringify(backup, backupReplacer, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="gasparzinho-backup-${dateName}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
