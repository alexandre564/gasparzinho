'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, MapPinned, MessageCircle, Navigation, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paymentMethodLabels, labelFrom } from '@/lib/labels';
import { buildGoogleMapsUrl, buildWazeUrl } from '@/lib/maps';
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
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  deliveryAddressChanged?: boolean;
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
  deliveryAddress,
  deliveryReference,
  deliveryAddressChanged,
}: DeliveryWorkflowActionsProps) {
  const [pending, setPending] = useState(false);
  const address = deliveryAddress || `${customer.street}, ${customer.number} - ${customer.neighborhood}, ${customer.city}`;
  const reference = deliveryReference || customer.reference || '-';
  const orderSummary = itemsText(items);
  const paymentLabel = labelFrom(paymentMethodLabels, paymentMethod);
  const googleMapsUrl = buildGoogleMapsUrl(address);
  const wazeUrl = buildWazeUrl(address);
  const customerMessage = `Olá ${customer.name}, seu pedido na Gás Gasparzinho saiu para entrega. Itens: ${orderSummary}. Total: ${currency.format(total)}. Pagamento: ${paymentLabel}.`;
  const driverMessage = `Entrega Gás Gasparzinho\nPedido: ${orderId}\nCliente: ${customer.name}\nTelefone: ${customer.phone}\nEndereço: ${address}\nReferência: ${customer.reference || '-'}\nItens: ${orderSummary}\nTotal: ${currency.format(total)}\nPagamento: ${paymentLabel}${hasOpenDebt ? ' / A RECEBER' : ''}`;
  const customerMessageWithAddress = address
    ? `${customerMessage} Endereço: ${address}.`
    : customerMessage;
  const driverMessageWithAddress = [
    'Entrega Gás Gasparzinho',
    `Pedido: ${orderId}`,
    `Cliente: ${customer.name}`,
    `Telefone: ${customer.phone}`,
    `Endereço: ${address}`,
    `Referência: ${reference}`,
    `Google Maps: ${googleMapsUrl}`,
    `Waze: ${wazeUrl}`,
    deliveryAddressChanged ? 'Atenção: endereço diferente do cadastro.' : null,
    `Itens: ${orderSummary}`,
    `Total: ${currency.format(total)}`,
    `Pagamento: ${paymentLabel}${hasOpenDebt ? ' / A RECEBER' : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
  const customerWhatsapp = buildWhatsAppUrl(customer.phone, customerMessageWithAddress);
  const driverWhatsappLink = buildWhatsAppUrl(driverWhatsapp, driverMessageWithAddress || driverMessage);

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
      <Button asChild size="sm" variant="outline" className="gap-2">
        <a href={googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir endereço no Google Maps">
          <MapPinned className="h-4 w-4" />
          Maps
        </a>
      </Button>
      <Button asChild size="sm" variant="outline" className="gap-2">
        <a href={wazeUrl} target="_blank" rel="noreferrer" aria-label="Abrir endereço no Waze">
          <Navigation className="h-4 w-4" />
          Waze
        </a>
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
