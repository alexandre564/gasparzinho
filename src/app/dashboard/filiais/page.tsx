import Link from 'next/link';
import { Building2, CheckCircle2, FileText, LockKeyhole, Settings } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const nextDecisions = [
  'Cliente com mesmo telefone poderá existir em mais de uma filial?',
  'Estoque será sempre separado por filial ou poderá ser compartilhado?',
  'Frota será exclusiva por filial ou poderá atender várias unidades?',
  'Configurações de cobrança e entrega serão globais ou por filial?',
  'Quais usuários atuais serão administradores gerais da plataforma Gas?',
] as const;

export default async function BranchesPage() {
  const branchName = await getDefaultBranchName();

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
        </CardContent>
      </Card>
    </div>
  );
}
