'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { DeliveryStatus } from "@/types/enums";
import { updateDeliveryStatus } from './actions';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';

interface StatusUpdaterProps {
  deliveryId: string;
  currentStatus: DeliveryStatus;
}

const getStatusClassName = (status: DeliveryStatus) => {
  switch (status) {
    case DeliveryStatus.EM_ROTA:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case DeliveryStatus.CANCELADA:
      return 'border-red-200 bg-red-50 text-red-700';
    case DeliveryStatus.PENDENTE:
    default:
      return 'border-slate-200 bg-slate-50 text-slate-800';
  }
};

export default function StatusUpdater({ deliveryId, currentStatus }: StatusUpdaterProps) {
  const [isPending, setIsPending] = useState(false);
  const editableStatuses = Object.values(DeliveryStatus).filter(
    (status) => status !== DeliveryStatus.ENTREGUE,
  );

  const handleStatusChange = async (newStatus: DeliveryStatus) => {
    if (newStatus === currentStatus) return;

    setIsPending(true);
    const result = await updateDeliveryStatus(deliveryId, newStatus);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setIsPending(false);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : currentStatus === DeliveryStatus.ENTREGUE ? (
        <Badge variant="success">ENTREGUE</Badge>
      ) : (
        <Select onValueChange={handleStatusChange} defaultValue={currentStatus}>
          <SelectTrigger className={`h-8 w-[140px] text-xs font-semibold focus:ring-0 focus:ring-offset-0 ${getStatusClassName(currentStatus)}`}>
             <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {editableStatuses.map(status => (
              <SelectItem key={status} value={status} className="text-xs">
                  {status.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
