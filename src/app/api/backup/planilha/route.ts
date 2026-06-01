import { NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { getDebtPaymentBreakdown } from '@/lib/debts';
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

  const [users, customers, products, orders, debts, expenses, vehicles, closings, settings, organizations, branches] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
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
    prisma.systemSetting.findMany({ orderBy: { key: 'asc' } }),
    optionalFindMany(() => prisma.organization.findMany({ orderBy: { name: 'asc' } })),
    optionalFindMany(() => prisma.branch.findMany({ orderBy: { name: 'asc' } })),
  ]);

  const csv = [
    'sep=;',
    section(
      'EQUIPE',
      ['nome', 'email', 'perfil', 'organizacao', 'filial', 'ativo', 'criado em'],
      users.map((user) => [
        user.name,
        user.email,
        user.role,
        user.organizationId,
        user.branchId,
        user.isActive ? 'sim' : 'não',
        user.createdAt.toLocaleDateString('pt-BR'),
      ]),
    ),
    section(
      'CLIENTES',
      ['nome', 'telefone', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'referencia', 'filial'],
      customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.cep,
        customer.street,
        customer.number,
        customer.neighborhood,
        customer.city,
        customer.reference,
        customer.branchId,
      ]),
    ),
    section(
      'PRODUTOS',
      ['nome', 'descricao', 'categoria', 'tipo estoque', 'saldo', 'custo', 'preco venda', 'filial'],
      products.map((product) => [
        product.name,
        product.description,
        product.category,
        product.stockKind,
        product.inventory,
        product.cost.toFixed(2).replace('.', ','),
        product.price.toFixed(2).replace('.', ','),
        product.branchId,
      ]),
    ),
    section(
      'VENDAS',
      [
        'data',
        'cliente',
        'status',
        'pagamento',
        'vencimento pagamento',
        'endereco entrega',
        'referencia entrega',
        'endereco diferente',
        'itens',
        'valor bruto',
        'custo',
        'valor liquido',
        'filial',
      ],
      orders.map((order) => [
        order.createdAt.toLocaleDateString('pt-BR'),
        order.customer.name,
        labelFrom(orderStatusLabels, order.status),
        labelFrom(paymentMethodLabels, order.paymentMethod),
        order.paymentDueDate?.toLocaleDateString('pt-BR') ?? '',
        order.deliveryAddress ?? '',
        order.deliveryReference ?? '',
        order.deliveryAddressChanged ? 'sim' : 'nao',
        order.items.map((item) => `${item.quantity}x ${item.product?.name ?? 'Produto removido'}`).join(' | '),
        order.grossValue.toFixed(2).replace('.', ','),
        order.totalCost.toFixed(2).replace('.', ','),
        order.netValue.toFixed(2).replace('.', ','),
        order.branchId,
      ]),
    ),
    section(
      'COBRANCAS',
      [
        'cliente',
        'telefone',
        'status',
        'valor original',
        'valor para pagamento',
        'vencimento',
        'vencimento original',
        'pago em',
        'renegociado em',
        'valor pago renegociacao',
        'restante registrado',
        'observacoes',
        'filial',
      ],
      debts.map((debt) => {
        const paymentBreakdown = getDebtPaymentBreakdown(debt.notes);

        return [
          debt.customer.name,
          debt.customer.phone,
          debt.status,
          debt.value.toFixed(2).replace('.', ','),
          (debt.renegotiatedValue ?? debt.value).toFixed(2).replace('.', ','),
          debt.dueDate.toLocaleDateString('pt-BR'),
          debt.originalDueDate?.toLocaleDateString('pt-BR') ?? '',
          debt.paidAt?.toLocaleDateString('pt-BR') ?? '',
          debt.renegotiatedAt?.toLocaleDateString('pt-BR') ?? '',
          paymentBreakdown.paidAmount?.toFixed(2).replace('.', ',') ?? '',
          paymentBreakdown.remainingValue?.toFixed(2).replace('.', ',') ?? '',
          debt.notes ?? '',
          debt.branchId,
        ];
      }),
    ),
    section(
      'DESPESAS',
      ['data', 'descricao', 'categoria', 'subcategoria', 'centro veiculo', 'pagamento', 'responsavel', 'valor', 'recorrente', 'filial'],
      expenses.map((expense) => [
        expense.date.toLocaleDateString('pt-BR'),
        expense.description,
        expense.category,
        expense.subCategory,
        expense.vehicleLabel,
        expense.paymentMethod,
        expense.responsible,
        expense.value.toFixed(2).replace('.', ','),
        expense.isRecurring ? 'sim' : 'não',
        expense.branchId,
      ]),
    ),
    section(
      'FROTA',
      ['placa', 'modelo', 'tipo', 'status', 'custo medio km', 'observacoes', 'filial'],
      vehicles.map((vehicle) => [
        vehicle.placa,
        vehicle.modelo,
        vehicle.tipo,
        vehicle.status,
        vehicle.custoMedioKm.toFixed(2).replace('.', ','),
        vehicle.observacoes,
        vehicle.branchId,
      ]),
    ),
    section(
      'FECHAMENTOS',
      ['data', 'vendas', 'entradas', 'despesas', 'saldo', 'filial'],
      closings.map((closing) => [
        closing.date.toLocaleDateString('pt-BR'),
        closing.ordersCount,
        Number(closing.totalRevenue).toFixed(2).replace('.', ','),
        Number(closing.totalExpenses).toFixed(2).replace('.', ','),
        Number(closing.netBalance).toFixed(2).replace('.', ','),
        closing.branchId,
      ]),
    ),
    section(
      'CONFIGURACOES',
      ['chave', 'valor', 'atualizado em'],
      settings.map((setting) => [
        setting.key,
        setting.value,
        setting.updatedAt.toLocaleDateString('pt-BR'),
      ]),
    ),
    section(
      'ORGANIZACOES',
      ['nome', 'documento', 'status', 'observacoes'],
      organizations.map((organization) => [
        organization.name,
        organization.document,
        organization.status,
        organization.notes,
      ]),
    ),
    section(
      'FILIAIS',
      ['organizacao', 'nome', 'nome fantasia', 'documento', 'telefone', 'cidade', 'status', 'contrato', 'plano', 'vencimento', 'observacoes'],
      branches.map((branch) => [
        branch.organizationId,
        branch.name,
        branch.tradingName,
        branch.document,
        branch.phone,
        branch.city,
        branch.status,
        branch.contractStatus,
        branch.planName,
        branch.contractDueAt?.toLocaleDateString('pt-BR') ?? '',
        branch.notes,
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
