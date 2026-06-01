import { NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope';
import { cleanCustomerTextFields, normalizeSearchText, onlyDigits } from '@/lib/contact-text';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;

function matchesCustomer(customer: {
  name: string;
  phone: string;
  city: string;
  neighborhood: string;
  street: string;
  reference: string | null;
}, query: string) {
  const cleanedCustomer = cleanCustomerTextFields(customer);
  const term = normalizeSearchText(query);
  const digits = onlyDigits(query);
  const textFields = [
    cleanedCustomer.name,
    cleanedCustomer.phone,
    cleanedCustomer.city,
    cleanedCustomer.neighborhood,
    cleanedCustomer.street,
    cleanedCustomer.reference,
  ].map(normalizeSearchText);
  const phoneDigits = onlyDigits(cleanedCustomer.phone);

  return textFields.some((field) => field.includes(term)) || Boolean(digits && phoneDigits.includes(digits));
}

export async function GET(request: Request) {
  const denied = await requireApiAccess(["ADMIN","VENDEDOR"]);

  if (denied) {
    return denied;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (!query) {
    return NextResponse.json({ customers: [] });
  }

  const branchScope = await getCurrentBranchScope();
  const customers = await prisma.customer.findMany({
    where: buildBranchWhere(branchScope),
    orderBy: { name: 'asc' },
    take: 300,
    select: {
      id: true,
      name: true,
      phone: true,
      city: true,
      neighborhood: true,
      street: true,
      reference: true,
      debts: {
        where: { status: { in: [...OPEN_DEBT_STATUSES] } },
        select: { value: true, renegotiatedValue: true },
      },
    },
  });

  const filtered = customers
    .filter((customer) => matchesCustomer(customer, query))
    .slice(0, 6)
    .map((customer) => {
      const cleanedCustomer = cleanCustomerTextFields(customer);

      return {
        id: cleanedCustomer.id,
        name: cleanedCustomer.name,
        phone: cleanedCustomer.phone,
        address: [cleanedCustomer.street, cleanedCustomer.neighborhood, cleanedCustomer.city].filter(Boolean).join(' - '),
        totalDebt: customer.debts.reduce((sum, debt) => sum + (debt.renegotiatedValue ?? debt.value), 0),
      };
    });

  return NextResponse.json({ customers: filtered });
}
