'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, MessageCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { confirmDeliveryPayment, markDeliverySentToDriver } from './actions';

type DeliveryWorkflowActionsProps = {
  deliveryId: string;
  orderId: string;
  status: string;
  customer: {
    name: string;
    phone: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    reference?: string | null;
  };
  items: Array<{ product: { name: string }; quantity: number }>;
  total: number;
  paymentMethod: string;
  hasOpenDebt: boolean;
  driverWhatsapp: string;
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function itemsText(items: DeliveryWorkflowActionsProps['items']) {
  return items.map((item) => `${item.quantity}x ${item.product.name}`).join(', ');
}

export default function DeliveryWorkflowActions({
  deliveryId,
  orderId,
  status,
  customer,
  items,
  total,
  paymentMethod,
  hasOpenDebt,
  driverWhatsapp,
}: DeliveryWorkflowActionsProps) {
  const [pending, setPending] = useState(false);
  const address = `${customer.street}, ${customer.number} - ${customer.neighborhood}, ${customer.city}`;
  const orderSummary = itemsText(items);
  const customerMessage = `Olá ${customer.name}, seu pedido na Gás Gasparzinho saiu para entrega. Itens: ${orderSummary}. Total: ${currency.format(total)}. Pagamento: ${paymentMethod}.`;
  const driverMessage = `Entrega Gás Gasparzinho\nPedido: ${orderId}\nCliente: ${customer.name}\nTelefone: ${customer.phone}\nEndereço: ${address}\nReferência: ${customer.reference || '-'}\nItens: ${orderSummary}\nTotal: ${currency.format(total)}\nPagamento: ${paymentMethod}${hasOpenDebt ? ' / A RECEBER' : ''}`;
  const customerWhatsapp = buildWhatsAppUrl(customer.phone, customerMessage);
  const driverWhatsappLink = buildWhatsAppUrl(driverWhatsapp, driverMessage);

  async function sendToDriver() {
    setPending(true);
    const result = await markDeliverySentToDriver(deliveryId);
    setPending(false);

    if (result.success) {
      toast.success(result.message);
      window.open(driverWhatsappLink, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.error(result.message);
  }

  async function confirm(paymentResult: 'PAGO' | 'A_RECEBER') {
    setPending(true);
    const result = await confirmDeliveryPayment(deliveryId, paymentResult);
    setPending(false);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  const delivered = status === 'ENTREGUE';

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button asChild size="sm" variant="outline" className="gap-2">
        <a href={customerWhatsapp} target="_blank" rel="noreferrer">
          <MessageCircle className="h-4 w-4" />
          Cliente
        </a>
      </Button>
      <Button size="sm" variant="outline" className="gap-2" onClick={sendToDriver} disabled={pending || delivered}>
        <Truck className="h-4 w-4" />
        Entregador
      </Button>
      <Button size="sm" className="gap-2" onClick={() => confirm('PAGO')} disabled={pending || delivered}>
        <CheckCircle2 className="h-4 w-4" />
        Entregue pago
      </Button>
      <Button size="sm" variant="secondary" onClick={() => confirm('A_RECEBER')} disabled={pending || delivered}>
        Entregue a receber
      </Button>
    </div>
  );
}
