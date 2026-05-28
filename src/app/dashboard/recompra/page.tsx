import Link from 'next/link';
import { Suspense } from 'react';
import {
  ArrowRight,
  Calendar,
  Download,
  Hourglass,
  MessageCircle,
  Phone,
  Repeat,
  ShoppingBag,
} from 'lucide-react';
import { format } from 'date-fns';

import { getRepurchasePredictions } from './actions';
import { RepurchasePrediction } from '@/services/recompra';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { Search } from '@/components/Search';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';


export const dynamic = 'force-dynamic';
const periodOptions = [3, 7, 15];

function FilterButton({ days, currentDays, query }: { days: number; currentDays: number; query: string }) {
  const isActive = days === currentDays;
  const params = new URLSearchParams();

  params.set('days', String(days));
  if (query) params.set('query', query);

  return (
    <Button asChild variant={isActive ? 'default' : 'outline'} size="sm">
      <Link href={`/dashboard/recompra?${params.toString()}`}>Próximos {days} dias</Link>
    </Button>
  );
}

function getUrgencyBadge(daysUntilNextPurchase: number) {
  if (daysUntilNextPurchase <= 0) {
    return <Badge variant="destructive">Comprar hoje</Badge>;
  }

  if (daysUntilNextPurchase <= 3) {
    return <Badge className="bg-amber-500 text-white">Muito próximo</Badge>;
  }

  return <Badge variant="secondary">Em breve</Badge>;
}

function PredictionCard({ prediction }: { prediction: RepurchasePrediction }) {
  const {
    customer,
    lastOrder,
    avgInterval,
    predictedNextPurchaseDate,
    daysUntilNextPurchase,
  } = prediction;
  const firstName = customer.name.split(' ')[0] || customer.name;
  const lastOrderProduct = lastOrder?.items[0]?.product.name || 'produto';
  const daysText = daysUntilNextPurchase <= 0 ? 'hoje' : `em ${daysUntilNextPurchase} dia(s)`;
  const whatsappMessage = `Olá ${firstName}, tudo bem? Vi aqui que talvez esteja chegando a hora de repor ${lastOrderProduct}. Posso separar um novo pedido para você?`;
  const whatsappUrl = buildWhatsAppUrl(customer.phone, whatsappMessage);

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-slate-50/80">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg font-bold text-slate-950">{customer.name}</CardTitle>
          {getUrgencyBadge(daysUntilNextPurchase)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <Phone className="h-4 w-4 text-slate-500" />
          {customer.phone}
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <ShoppingBag className="h-4 w-4 text-slate-500" />
          Último pedido:{' '}
          {lastOrder ? `${format(lastOrder.createdAt, 'dd/MM/yyyy')} (${lastOrderProduct})` : 'sem pedido'}
        </div>
        <div className="flex items-center gap-2 text-slate-700">
          <Repeat className="h-4 w-4 text-slate-500" />
          Intervalo médio: {avgInterval} dias
        </div>
        <div className="flex items-center gap-2 font-semibold text-emerald-800">
          <Calendar className="h-4 w-4" />
          Previsão: {format(predictedNextPurchaseDate, 'dd/MM/yyyy')}
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Hourglass className="h-4 w-4" />
          Oportunidade {daysText}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t bg-white sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </Button>
        <Button asChild size="sm" className="w-full gap-2 sm:w-auto">
          <Link href={`/dashboard/vendas/novo?customerId=${customer.id}`}>
            Iniciar venda
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default async function RecompraPreditivaPage({
  searchParams,
}: {
  searchParams?: { days?: string; query?: string };
}) {
  const requestedDays = Number(searchParams?.days) || 3;
  const days = periodOptions.includes(requestedDays) ? requestedDays : 3;
  const query = searchParams?.query ?? '';
  const exportParams = new URLSearchParams();

  exportParams.set('days', String(days));
  if (query) exportParams.set('query', query);

  const predictions = await getRepurchasePredictions(days, query);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Recompra</h1>
          <p className="text-sm text-slate-600">
            Clientes com maior chance de comprar novamente, calculados pelo histórico de pedidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/recompra/exportar?${exportParams.toString()}`} download>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          {periodOptions.map((option) => (
            <FilterButton key={option} days={option} currentDays={days} query={query} />
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <Suspense fallback={<div className="h-11 w-full max-w-xl rounded-md border bg-white" />}>
          <Search placeholder="Buscar recompra por cliente, telefone ou produto..." />
        </Suspense>
      </div>

      {predictions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {predictions.map((prediction) => (
            <PredictionCard key={prediction.customer.id} prediction={prediction} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed bg-white py-12 text-center">
          <Hourglass className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-sm font-semibold text-slate-950">Nenhuma recompra prevista</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Nenhum cliente entrou nos critérios de recompra para os próximos {days} dias.
            Conforme novas vendas forem registradas, esta lista fica mais precisa.
          </p>
        </div>
      )}
    </div>
  );
}
