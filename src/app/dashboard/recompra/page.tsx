import { Suspense } from 'react';
import Link from 'next/link';
import { getRepurchasePredictions } from './actions';
import { RepurchasePrediction } from '@/services/recompra';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Phone, Calendar, Repeat, ArrowRight, Hourglass, ShoppingBag, MessageCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FilterButton = ({ days, currentDays }: { days: number, currentDays: number }) => {
    const isActive = days === currentDays;
    return (
        <Link href={`/dashboard/recompra?days=${days}`} passHref>
             <Button variant={isActive ? 'default' : 'outline'}>
                PrÃ³ximos {days} dias
            </Button>
        </Link>
    );
};

const PredictionCard = ({ prediction }: { prediction: RepurchasePrediction }) => {
    const { customer, lastOrder, avgInterval, predictedNextPurchaseDate, daysUntilNextPurchase } = prediction;
    const lastOrderProduct = lastOrder?.items[0]?.product.name || 'N/A';

    const cleanPhone = customer.phone.replace(/\D/g, '');
    const whatsappMessage = `OlÃ¡ ${customer.name.split(' ')[0]}, tudo bem? Notei que estÃ¡ chegando a hora de renovar seu estoque de ${lastOrderProduct}. Que tal fazermos um novo pedido?`;
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    const daysText = daysUntilNextPurchase === 0 ? 'hoje' : `em ${daysUntilNextPurchase} dia(s)`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{customer.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-muted-foreground" /> {customer.phone}</div>
                <div className="flex items-center"><ShoppingBag className="w-4 h-4 mr-2 text-muted-foreground" /> Ãšltimo Pedido: {lastOrder ? `${format(lastOrder.createdAt, 'dd/MM/yyyy')} (${lastOrderProduct})` : 'N/A'}</div>
                <div className="flex items-center"><Repeat className="w-4 h-4 mr-2 text-muted-foreground" /> Intervalo MÃ©dio: {avgInterval} dias</div>
                <div className="flex items-center font-semibold"><Calendar className="w-4 h-4 mr-2 text-primary" /> Recompra prevista para {format(predictedNextPurchaseDate, 'dd/MM/yyyy')}</div>
                 <div className="flex items-center text-muted-foreground"><Hourglass className="w-4 h-4 mr-2" /> Vence {daysText}</div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                 <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 mr-2"/> WhatsApp</Button>
                </a>
                <Link href={`/dashboard/vendas/novo?customerId=${customer.id}`} passHref>
                    <Button size="sm">Iniciar Venda <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </Link>
            </CardFooter>
        </Card>
    );
}

export default async function RecompraPreditivaPage({ searchParams }: { searchParams?: { days?: string } }) {
    const days = Number(searchParams?.days) || 3;
    const predictions = await getRepurchasePredictions(days);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Recompra Preditiva</h1>
                <p className="text-muted-foreground">Clientes com maior probabilidade de comprar novamente em breve.</p>
            </div>

            <div className="flex items-center gap-2">
                <FilterButton days={3} currentDays={days} />
                <FilterButton days={7} currentDays={days} />
                <FilterButton days={15} currentDays={days} />
            </div>

            <Suspense fallback={<p>Carregando previsÃµes...</p>}>
                {predictions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {predictions.map(prediction => (
                            <PredictionCard key={prediction.customer.id} prediction={prediction} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <Hourglass className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">Nenhum cliente previsto</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Nenhum cliente corresponde aos critÃ©rios de recompra para os prÃ³ximos {days} dias.</p>
                    </div>
                )}
            </Suspense>
        </div>
    );
}
