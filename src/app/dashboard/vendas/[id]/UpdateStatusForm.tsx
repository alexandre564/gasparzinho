'use client';

import { useTransition } from 'react';
import type { OrderStatus } from '@/types/enums';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateOrderStatus } from '@/actions/order-actions';
import { toast } from 'sonner';

const availableStatus = [
  'PENDENTE',
  'PROCESSANDO',
  'CONCLUIDO',
  'CANCELADO',
] as const satisfies readonly OrderStatus[];

type UpdateableOrderStatus = (typeof availableStatus)[number];

interface UpdateStatusFormProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export default function UpdateStatusForm({
  orderId,
  currentStatus,
}: UpdateStatusFormProps) {
  const [isPending, startTransition] = useTransition();

  const normalizedCurrentStatus: UpdateableOrderStatus =
    availableStatus.includes(currentStatus as UpdateableOrderStatus)
      ? (currentStatus as UpdateableOrderStatus)
      : 'PENDENTE';

  const handleStatusChange = (newStatus: string) => {
    const nextStatus = newStatus as UpdateableOrderStatus;

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, nextStatus);

      if (result.success) {
        toast.success(result.message || 'Status atualizado com sucesso.');
      } else {
        toast.error(result.message || 'Falha ao atualizar status.');
      }
    });
  };

  return (
    <div className="space-y-2">
      <Select
        defaultValue={normalizedCurrentStatus}
        onValueChange={handleStatusChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione um status" />
        </SelectTrigger>
        <SelectContent>
          {availableStatus.map((status) => (
            <SelectItem key={status} value={status}>
              {status.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}