'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { labelFrom, paymentMethodLabels } from '@/lib/labels';

const PAYMENT_METHODS = [
  'DINHEIRO',
  'PIX',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'FIADO',
];

export function PaymentMethodFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handlePaymentMethodChange(paymentMethod: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (paymentMethod && paymentMethod !== 'ALL') {
      params.set('paymentMethod', paymentMethod);
    } else {
      params.delete('paymentMethod');
    }

    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      defaultValue={searchParams.get('paymentMethod') || 'ALL'}
      onValueChange={handlePaymentMethodChange}
    >
      <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filtrar por pagamento">
        <SelectValue placeholder="Pagamento" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todos os pagamentos</SelectItem>
        {PAYMENT_METHODS.map((paymentMethod) => (
          <SelectItem key={paymentMethod} value={paymentMethod}>
            {labelFrom(paymentMethodLabels, paymentMethod)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
