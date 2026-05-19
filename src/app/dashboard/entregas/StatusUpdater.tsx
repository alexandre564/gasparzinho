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

const getStatusVariant = (status: DeliveryStatus) => {
  switch (status as any) {
    case 'ENTREGUE': return 'success';
    case 'PENDENTE': return 'secondary';
    case 'EM_ROTA': return 'default';
    case 'FALHA': return 'destructive';
    default: return 'outline';
  }
};

export default function StatusUpdater({ deliveryId, currentStatus }: StatusUpdaterProps) {
  const [isPending, setIsPending] = useState(false);

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
      ) : (
        <Select onValueChange={handleStatusChange} defaultValue={currentStatus}>
          <SelectTrigger className={`w-[140px] h-8 text-xs font-semibold border-0 focus:ring-0 focus:ring-offset-0 ${getStatusVariant(currentStatus)}`}>
             <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(DeliveryStatus).map(status => (
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
