'use client';

import { useState, useTransition } from 'react';
import { OrderStatus } from "@/types/enums";
import { updateOrderStatus } from './actions';

interface OrderStatusChangerProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function OrderStatusChanger({ orderId, currentStatus }: OrderStatusChangerProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    setSelectedStatus(newStatus);

    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };
  
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'CONFIRMADO': return 'bg-blue-100 text-blue-800';
      case 'CONCLUIDO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      case 'RASCUNHO': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(selectedStatus)}`}>
        {isPending ? 'Atualizando...' : selectedStatus}
      </span>
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        disabled={isPending}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
      >
        {Object.values(OrderStatus).map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </div>
  );
}
