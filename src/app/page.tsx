import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

const highlights = [
  {
    icon: ClipboardList,
    title: 'Vendas rápidas',
    text: 'Registre pedidos de gás, água e acessórios com cliente, pagamento e entrega no mesmo fluxo.',
  },
  {
    icon: PackageCheck,
    title: 'Estoque no controle',
    text: 'Acompanhe produtos, botijões e reposição para evitar falta nas rotas de entrega.',
  },
  {
    icon: Truck,
    title: 'Entregas visíveis',
    text: 'Veja pedidos pendentes, em rota e concluídos para organizar o atendimento do dia.',
  },
  {
    icon: Banknote,
    title: 'Financeiro claro',
    text: 'Monitore vendas, despesas, dívidas e fechamento diário em um painel único.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
              <PackageCheck className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-normal">Gás Gasparzinho</span>
          </Link>
          <Button asChild variant="secondary" className="bg-white text-slate-950 hover:bg-amber-100">
            <Link href="/login">Entrar</Link>
          </Button>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-amber-400 px-3 py-1 text-sm font-semibold text-slate-950">
              <ShieldCheck className="h-4 w-4" />
              Sistema de gestão para revenda de gás
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Venda, entregue e feche o caixa do gás em um só lugar.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              O Gasparzinho centraliza pedidos, clientes, estoque, entregas, cobranças e relatórios
              para a operação diária de uma revenda de gás.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                <Link href="/dashboard">
                  Abrir painel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-600 bg-transparent text-white hover:bg-white hover:text-slate-950"
              >
                <Link href="/dashboard/vendas/novo">Nova venda</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/30">
            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <item.icon className="h-6 w-6 text-amber-300" />
                  <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-emerald-900/70 bg-emerald-950/40 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-emerald-300" />
                <p className="text-sm font-medium text-emerald-100">
                  Preparado para equipes com administrador, vendedor e entregador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
