import Link from 'next/link';
import { Building2, CheckCircle2, FileText, LockKeyhole, PlayCircle, Settings } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBranchOverview } from '@/lib/branch-data';
import { getDefaultBranchName } from '@/lib/branch-settings';

export const dynamic = 'force-dynamic';

const readinessItems = [
  {
    title: 'Filial padrão configurável',
    status: 'Iniciado',
    description: 'O sistema já exibe uma filial ativa sem alterar o isolamento dos dados atuais.',
  },
  {
    title: 'Mapeamento técnico',
    status: 'Documentado',
    description: 'Os módulos foram classificados entre escopo global, por usuário e por filial.',
  },
  {
    title: 'Modelos Prisma preparados',
    status: 'Preparado',
    description: 'Organization e Branch já existem no schema, ainda sem conexão com dados operacionais.',
  },
  {
    title: 'Criação no banco',
    status: 'Pronto para executar',
    description: 'Migração, db:safe-sync e seed da filial padrão já estão preparados.',
  },
  {
    title: 'Migração real de dados',
    status: 'Pendente',
    description: 'A criação de Organization, Branch e branchId deve aguardar regras de negócio fechadas.',
  },
] as const;

const technicalChecks = [
  {
    command: 'npm run branches:audit',
    description: 'Lista os pontos do sistema que usam Prisma e que precisarão de filtro por filial no futuro.',
  },
  {
    command: 'npm run branches:schema-audit',
    description: 'Confere se o schema está na etapa correta antes de adicionar branchId aos dados operacionais.',
  },
  {
    command: 'npm run branches:seed-default',
    description: 'Cria a organização Gas e a filial padrão no banco quando as variáveis de conexão estiverem ativas.',
  },
] as const;

const nextDecisions = [
  'Cliente com mesmo telefone poderá existir em mais de uma filial?',
  'Estoque será sempre separado por filial ou poderá ser compartilhado?',
  'Frota será exclusiva por filial ou poderá atender várias unidades?',
  'Configurações de cobrança e entrega serão globais ou por filial?',
  'Quais usuários atuais serão administradores gerais da plataforma Gas?',
] as const;

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
            Preparação segura para administrar o Gasparzinho e futuras revendas sem misturar dados.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/configuracoes">
            <Settings className="h-4 w-4" />
            Alterar filial padrão
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              Filial ativa atual
            </CardTitle>
            <CardDescription>
              Esta é a filial lógica usada enquanto a migração multifilial real ainda não foi aplicada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Filial padrão</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{branchName}</p>
              <p className="mt-2 text-sm text-slate-600">
                Os dados atuais continuam funcionando como antes. Esta etapa prepara a identidade da filial sem alterar vendas,
                clientes, cobranças ou estoque.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-600 text-white">Sem migração arriscada</Badge>
              <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">
                Compatível com a versão atual
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
            <CardDescription>
              Pontos que precisam ser definidos antes de isolar dados por filial.
            </CardDescription>
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
          <CardDescription>
            O objetivo é avançar por camadas, mantendo a operação atual estável.
          </CardDescription>
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
          <CardTitle>Filiais registradas no banco</CardTitle>
          <CardDescription>
            Leitura segura da base multifilial. Se as tabelas ainda não existirem, a operação atual continua preservada.
          </CardDescription>
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
                        <Badge className="bg-emerald-600 text-white">{branch.status}</Badge>
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
                    </div>
                  )),
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                As tabelas multifiliais existem, mas a filial padrão ainda não foi criada. Execute o seed seguro quando o banco estiver acessível.
              </div>
            )
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              A base de filiais ainda não está disponível neste ambiente. Isso é esperado antes da sincronização segura do banco.
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
          <CardDescription>
            Etapas técnicas que podem ser conferidas sem alterar vendas, clientes, cobranças ou estoque.
          </CardDescription>
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
          <CardDescription>
            Base para a próxima etapa técnica antes de mexer no banco.
          </CardDescription>
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
