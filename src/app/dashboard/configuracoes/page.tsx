export const dynamic = 'force-dynamic';
import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  Banknote,
  Download,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getDefaultBranchName } from '@/lib/branch-settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { labelFrom, productCategoryLabels, stockKindLabels } from '@/lib/labels';
import BranchSettingsForm from './BranchSettingsForm';
import CollectionMessageForm from './CollectionMessageForm';
import DriverWhatsappForm from './DriverWhatsappForm';
import { getCollectionMessageTemplate, getDriverWhatsappNumber } from './actions';
import { expenseLabel } from '../financeiro/despesas/categories';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

async function getSettingsData() {
  const [products, recentExpenses, productCount, expenseMonth, stockValue, collectionMessage, driverWhatsapp, defaultBranchName] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      take: 8,
    }),
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
      take: 6,
    }),
    prisma.product.count(),
    prisma.expense.aggregate({
      _sum: { value: true },
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
        },
      },
    }),
    prisma.product.findMany({ select: { inventory: true, cost: true } }),
    getCollectionMessageTemplate(),
    getDriverWhatsappNumber(),
    getDefaultBranchName(),
  ]);

  return {
    products,
    recentExpenses,
    productCount,
    monthExpenses: expenseMonth._sum.value ?? 0,
    stockCostValue: stockValue.reduce((sum, product) => sum + product.inventory * product.cost, 0),
    collectionMessage,
    driverWhatsapp,
    defaultBranchName,
  };
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function ConfiguracoesPage() {
  const session = await auth();
  const canDownloadBackup = session?.user?.role?.toUpperCase() === 'ADMIN';
  const data = await getSettingsData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Settings className="h-4 w-4" />
            Central do sistema
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Configurações</h2>
          <p className="text-sm text-slate-600">
            Ajuste produtos, preços, custos, gastos, mensagens e baixe uma cópia dos dados.
          </p>
        </div>
        {canDownloadBackup ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="gap-2">
              <a href="/api/backup/planilha" download>
                <Download className="h-4 w-4" />
                Backup planilha
              </a>
            </Button>
            <Button asChild className="gap-2">
              <a href="/api/backup" download>
                <Download className="h-4 w-4" />
                Backup completo
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Produtos cadastrados"
          value={data.productCount}
          description="Itens disponíveis para venda e controle de estoque."
          icon={Package}
        />
        <SummaryCard
          title="Custo em estoque"
          value={currency.format(data.stockCostValue)}
          description="Valor estimado pelo custo dos produtos em estoque."
          icon={Banknote}
        />
        <SummaryCard
          title="Gastos do mês"
          value={currency.format(data.monthExpenses)}
          description="Soma das despesas registradas no mês atual."
          icon={Receipt}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Produtos e preços</CardTitle>
              <CardDescription>
                Altere preço de venda, custo e saldo pelo cadastro de estoque.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href="/dashboard/estoque/novo">
                  Novo produto
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link href="/dashboard/estoque">
                  Ver estoque
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.length > 0 ? (
                  data.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-slate-500">{labelFrom(stockKindLabels, product.stockKind)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{labelFrom(productCategoryLabels, product.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{product.inventory}</TableCell>
                      <TableCell className="text-right font-mono">{currency.format(product.cost)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-700">
                        {currency.format(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/estoque/${product.id}/editar`}>Alterar</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum produto cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filial ativa</CardTitle>
              <CardDescription>
                Nome operacional usado como filial padrão enquanto a plataforma Gas multifilial é preparada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BranchSettingsForm defaultValue={data.defaultBranchName} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-700" />
                Texto do WhatsApp de cobrança
              </CardTitle>
              <CardDescription>
                Mensagem padrão usada no módulo Cobrança. Você pode editar livremente e usar as variáveis abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CollectionMessageForm defaultValue={data.collectionMessage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-700" />
                WhatsApp do entregador
              </CardTitle>
              <CardDescription>
                Número padrão usado para enviar pedidos ao entregador pelo módulo Entregas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DriverWhatsappForm defaultValue={data.driverWhatsapp} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gastos e despesas</CardTitle>
              <CardDescription>
                Controle contas, compras operacionais e despesas recorrentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-between">
                <Link href="/dashboard/financeiro/despesas">
                  Gerenciar despesas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="space-y-2">
                {data.recentExpenses.length > 0 ? (
                  data.recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-slate-500">{expenseLabel(expense.category)}</p>
                      </div>
                      <p className="text-sm font-semibold text-red-700">{currency.format(expense.value)}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-slate-500">
                    Nenhuma despesa registrada.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {canDownloadBackup ? (
            <Card>
              <CardHeader>
                <CardTitle>Backup do sistema</CardTitle>
                <CardDescription>
                  Baixe arquivos com os dados principais do sistema para segurança e conferência.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Use o backup antes de grandes alterações de preço, estoque ou financeiro.</p>
                </div>
                <div className="grid gap-2">
                  <Button asChild variant="outline" className="w-full justify-between">
                    <a href="/api/backup/planilha" download>
                      <span className="inline-flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        Baixar planilha diária
                      </span>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-between">
                    <a href="/api/backup" download>
                      <span className="inline-flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        Baixar cópia completa
                      </span>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
