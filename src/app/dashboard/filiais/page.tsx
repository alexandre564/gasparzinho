import Link from 'next/link';
import { Building2, CheckCircle2, FileText, LockKeyhole, PlayCircle, PlusCircle, Save, Settings } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBranchOverview } from '@/lib/branch-data';
import { DEFAULT_BRANCH_ID } from '@/lib/branch-scope';
import { getDefaultBranchName } from '@/lib/branch-settings';
import { createBranch, pauseOrActivateBranch, updateBranch } from './actions';

export const dynamic = 'force-dynamic';

const readinessItems = [
  {
    title: 'Filial padrão configurável',
    status: 'Concluído',
    description: 'O sistema exibe a filial ativa no desktop e no celular.',
  },
  {
    title: 'Escopo operacional',
    status: 'Concluído',
    description: 'Módulos principais, exportações, backup e relatórios aplicam filtro por filial.',
  },
  {
    title: 'Unicidade por filial',
    status: 'Concluído',
    description: 'Clientes, produtos e veículos podem se repetir em filiais diferentes sem conflito.',
  },
  {
    title: 'Validação de produção',
    status: 'Pendente',
    description: 'Ainda falta validar com usuários reais e segunda filial controlada.',
  },
] as const;

const technicalChecks = [
  {
    command: 'npm run branches:audit',
    description: 'Confirma se acessos Prisma operacionais usam escopo por filial.',
  },
  {
    command: 'npm run branches:schema-audit',
    description: 'Confere se o schema possui a base multifilial esperada.',
  },
  {
    command: 'npm run branches:data-audit',
    description: 'Confere, no banco real, se existem registros antigos sem filial.',
  },
] as const;

const branchStatusOptions = ['ATIVA', 'PAUSADA', 'SUSPENSA', 'CANCELADA'] as const;
const contractStatusOptions = ['PROPRIA', 'TESTE', 'ALUGADA', 'LICENCIADA', 'SUSPENSA', 'CANCELADA'] as const;

const nextDecisions = [
  'Validar isolamento com uma segunda filial real de teste.',
  'Definir se configurações de WhatsApp serão globais ou por filial.',
  'Definir quando branchId poderá se tornar obrigatório no banco.',
  'Validar quais usuários serão administradores gerais da plataforma Gas.',
] as const;

function statusVariant(status: string) {
  if (status === 'ATIVA') return 'success' as const;
  if (status === 'PAUSADA') return 'secondary' as const;
  if (status === 'CANCELADA' || status === 'SUSPENSA') return 'destructive' as const;
  return 'default' as const;
}

export default async function BranchesPage() {
  const [branchName, branchOverview] = await Promise.all([getDefaultBranchName(), getBranchOverview()]);
  const branchCount = branchOverview.organizations.reduce((total, organization) => total + organization.branches.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Building2 className="h-4 w-4" />
            Plataforma Gas
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Filiais</h2>
          <p className="text-sm text-slate-600">
            Administre o Gasparzinho e futuras revendas sem misturar clientes, vendas, estoque ou cobrança.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/configuracoes">
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              Filial ativa
            </CardTitle>
            <CardDescription>Esta é a filial lógica usada como base da operação atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Filial padrão</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{branchName}</p>
              <p className="mt-2 text-sm text-slate-600">
                O sistema já trabalha com escopo por filial, mantendo a operação atual preservada.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-600 text-white">Base segura</Badge>
              <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">
                Escopo operacional ativo
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-slate-700" />
              Próximas decisões
            </CardTitle>
            <CardDescription>Pontos que dependem de validação real antes de endurecer o banco.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextDecisions.map((decision) => (
                <li key={decision} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {decision}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Andamento da preparação</CardTitle>
          <CardDescription>Resumo do que já está pronto e do que ainda precisa de homologação.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {readinessItems.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Badge variant={item.status === 'Pendente' ? 'secondary' : 'default'}>{item.status}</Badge>
              <h3 className="mt-3 font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-emerald-700" />
            Nova filial
          </CardTitle>
          <CardDescription>Cadastro administrativo para unidades próprias, alugadas ou licenciadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBranch} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Nome
              <input name="name" required minLength={3} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Gas Gasparzinho Zona Norte" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Nome fantasia
              <input name="tradingName" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Gasparzinho Norte" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Cidade
              <input name="city" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Lavras" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Status
              <select name="status" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue="ATIVA">
                {branchStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Contrato
              <select name="contractStatus" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue="PROPRIA">
                <option value="PROPRIA">Própria</option>
                <option value="TESTE">Teste</option>
                <option value="ALUGADA">Alugada</option>
                <option value="LICENCIADA">Licenciada</option>
                <option value="SUSPENSA">Suspensa</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Plano
              <input name="planName" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Padrão" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Telefone
              <input name="phone" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="(35) 99999-9999" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Documento
              <input name="document" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="CNPJ ou CPF" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Vencimento
              <input name="contractDueAt" type="date" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 md:col-span-2">
              Observações
              <input name="notes" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" placeholder="Condições comerciais, uso e suporte" />
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <Button type="submit" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Cadastrar filial
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filiais registradas</CardTitle>
          <CardDescription>Unidades reais disponíveis para acompanhamento e seleção pelo administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          {branchOverview.setupAvailable ? (
            branchCount > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {branchOverview.organizations.flatMap((organization) =>
                  organization.branches.map((branch) => (
                    <div key={branch.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{organization.name}</p>
                          <h3 className="mt-1 font-semibold text-slate-950">{branch.name}</h3>
                        </div>
                        <Badge variant={statusVariant(branch.status)}>{branch.status}</Badge>
                      </div>
                      <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                        <div className="flex justify-between gap-3">
                          <dt>Cidade</dt>
                          <dd className="font-medium text-slate-900">{branch.city || 'Não informada'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Contrato</dt>
                          <dd className="font-medium text-slate-900">{branch.contractStatus}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Plano</dt>
                          <dd className="font-medium text-slate-900">{branch.planName || 'Padrão'}</dd>
                        </div>
                      </dl>
                      <form action={updateBranch} className="mt-4 grid gap-2">
                        <input type="hidden" name="id" value={branch.id} />
                        <input name="name" required minLength={3} defaultValue={branch.name} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Nome da filial" />
                        <input name="tradingName" defaultValue={branch.tradingName ?? ''} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Nome fantasia da filial" />
                        <input name="city" defaultValue={branch.city ?? ''} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Cidade da filial" />
                        <input name="phone" defaultValue={branch.phone ?? ''} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Telefone da filial" />
                        <input name="document" defaultValue={branch.document ?? ''} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Documento da filial" />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            name="status"
                            defaultValue={branch.status}
                            disabled={branch.id === DEFAULT_BRANCH_ID}
                            className="h-9 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
                            aria-label="Status da filial"
                          >
                            {branchStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          {branch.id === DEFAULT_BRANCH_ID ? <input type="hidden" name="status" value="ATIVA" /> : null}
                          <select name="contractStatus" defaultValue={branch.contractStatus} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Status contratual da filial">
                            {contractStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input name="planName" defaultValue={branch.planName ?? ''} className="h-9 rounded-md border border-slate-300 px-3 text-sm" aria-label="Plano da filial" />
                        <input
                          name="contractDueAt"
                          type="date"
                          defaultValue={branch.contractDueAt ? branch.contractDueAt.toISOString().slice(0, 10) : ''}
                          className="h-9 rounded-md border border-slate-300 px-3 text-sm"
                          aria-label="Vencimento do contrato"
                        />
                        <textarea
                          name="notes"
                          defaultValue={branch.notes ?? ''}
                          className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
                          aria-label="Observacoes da filial"
                          placeholder="Observacoes comerciais e operacionais"
                        />
                        <Button type="submit" variant="outline" size="sm" className="gap-2">
                          <Save className="h-4 w-4" />
                          Salvar filial
                        </Button>
                      </form>
                      {branch.id !== DEFAULT_BRANCH_ID ? (
                        <form action={pauseOrActivateBranch} className="mt-2">
                          <input type="hidden" name="id" value={branch.id} />
                          <input type="hidden" name="status" value={branch.status === 'ATIVA' ? 'PAUSADA' : 'ATIVA'} />
                          <Button type="submit" variant="secondary" size="sm" className="w-full">
                            {branch.status === 'ATIVA' ? 'Pausar filial' : 'Ativar filial'}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  )),
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                As tabelas multifiliais existem, mas a filial padrão ainda não foi criada.
              </div>
            )
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              A base de filiais ainda não está disponível neste ambiente.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-emerald-700" />
            Verificações seguras
          </CardTitle>
          <CardDescription>Comandos de auditoria para acompanhar a evolução multifilial.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {technicalChecks.map((item) => (
            <div key={item.command} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <code className="rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-white">{item.command}</code>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            Documentos de apoio
          </CardTitle>
          <CardDescription>Plano, levantamento e checklist usados para controlar a transição.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="justify-start">
            <Link href="https://github.com/alexandre564/gasparzinho/blob/main/docs/PLANO-Gas-Multifilial.md">
              Plano multifilial
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="https://github.com/alexandre564/gasparzinho/blob/main/docs/LEVANTAMENTO-Multifilial.md">
              Levantamento técnico
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="https://github.com/alexandre564/gasparzinho/blob/main/docs/CHECKLIST-Multifilial.md">
              Checklist de execução
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
