import { NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { labelFrom, orderStatusLabels, paymentMethodLabels } from '@/lib/labels';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function section(title: string, header: string[], rows: unknown[][]) {
  return [
    [title].map(csvCell).join(';'),
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
    '',
  ].join('\r\n');
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const [customers, products, orders, debts, expenses, vehicles, closings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({ orderBy: { name: 'asc' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: true, items: { include: { product: true } }, debt: true },
    }),
    prisma.debt.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    prisma.expense.findMany({ orderBy: { date: 'desc' } }),
    prisma.vehicle.findMany({ orderBy: { placa: 'asc' } }),
    prisma.dailyClosing.findMany({ orderBy: { date: 'desc' } }),
  ]);

  const csv = [
    'sep=;',
    section(
      'CLIENTES',
      ['nome', 'telefone', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'referencia'],
      customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.cep,
        customer.street,
        customer.number,
        customer.neighborhood,
        customer.city,
        customer.reference,
      ]),
    ),
    section(
      'PRODUTOS',
      ['nome', 'descricao', 'categoria', 'tipo estoque', 'saldo', 'custo', 'preco venda'],
      products.map((product) => [
        product.name,
        product.description,
        product.category,
        product.stockKind,
        product.inventory,
        product.cost.toFixed(2).replace('.', ','),
        product.price.toFixed(2).replace('.', ','),
      ]),
    ),
    section(
      'VENDAS',
      ['data', 'cliente', 'status', 'pagamento', 'itens', 'valor bruto', 'custo', 'valor liquido'],
      orders.map((order) => [
        order.createdAt.toLocaleDateString('pt-BR'),
        order.customer.name,
        labelFrom(orderStatusLabels, order.status),
        labelFrom(paymentMethodLabels, order.paymentMethod),
        order.items.map((item) => `${item.quantity}x ${item.product?.name ?? 'Produto removido'}`).join(' | '),
        order.grossValue.toFixed(2).replace('.', ','),
        order.totalCost.toFixed(2).replace('.', ','),
        order.netValue.toFixed(2).replace('.', ','),
      ]),
    ),
    section(
      'COBRANCAS',
      ['cliente', 'telefone', 'status', 'valor', 'vencimento', 'pago em', 'renegociado em', 'novo valor'],
      debts.map((debt) => [
        debt.customer.name,
        debt.customer.phone,
        debt.status,
        debt.value.toFixed(2).replace('.', ','),
        debt.dueDate.toLocaleDateString('pt-BR'),
        debt.paidAt?.toLocaleDateString('pt-BR') ?? '',
        debt.renegotiatedAt?.toLocaleDateString('pt-BR') ?? '',
        debt.renegotiatedValue?.toFixed(2).replace('.', ',') ?? '',
      ]),
    ),
    section(
      'DESPESAS',
      ['data', 'descricao', 'categoria', 'valor', 'recorrente'],
      expenses.map((expense) => [
        expense.date.toLocaleDateString('pt-BR'),
        expense.description,
        expense.category,
        expense.value.toFixed(2).replace('.', ','),
        expense.isRecurring ? 'sim' : 'não',
      ]),
    ),
    section(
      'FROTA',
      ['placa', 'modelo', 'tipo', 'status', 'custo medio km', 'observacoes'],
      vehicles.map((vehicle) => [
        vehicle.placa,
        vehicle.modelo,
        vehicle.tipo,
        vehicle.status,
        vehicle.custoMedioKm.toFixed(2).replace('.', ','),
        vehicle.observacoes,
      ]),
    ),
    section(
      'FECHAMENTOS',
      ['data', 'vendas', 'entradas', 'despesas', 'saldo'],
      closings.map((closing) => [
        closing.date.toLocaleDateString('pt-BR'),
        closing.ordersCount,
        Number(closing.totalRevenue).toFixed(2).replace('.', ','),
        Number(closing.totalExpenses).toFixed(2).replace('.', ','),
        Number(closing.netBalance).toFixed(2).replace('.', ','),
      ]),
    ),
  ].join('\r\n');

  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="backup-planilha-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
