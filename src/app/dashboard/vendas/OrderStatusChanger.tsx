'use client';

import { useState, useTransition } from 'react';
import type { OrderStatus } from '@/types/enums';
import { updateOrderStatus } from './actions';

const orderStatusOptions = [
  'PENDENTE',
  'CONFIRMADO',
  'EM_PREPARO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO',
] as const satisfies readonly OrderStatus[];

type ChangeableOrderStatus = (typeof orderStatusOptions)[number];

interface OrderStatusChangerProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function OrderStatusChanger({
  orderId,
  currentStatus,
}: OrderStatusChangerProps) {
  const [isPending, startTransition] = useTransition();

  const normalizedCurrentStatus: ChangeableOrderStatus =
    orderStatusOptions.includes(currentStatus as ChangeableOrderStatus)
      ? (currentStatus as ChangeableOrderStatus)
      : 'PENDENTE';

  const [selectedStatus, setSelectedStatus] =
    useState<ChangeableOrderStatus>(normalizedCurrentStatus);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ChangeableOrderStatus;
    setSelectedStatus(newStatus);

    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  const getStatusColor = (status: ChangeableOrderStatus) => {
    switch (status) {
      case 'CONFIRMADO':
        return 'bg-blue-100 text-blue-800';
      case 'ENTREGUE':
        return 'bg-green-100 text-green-800';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      case 'EM_PREPARO':
        return 'bg-yellow-100 text-yellow-800';
      case 'PRONTO':
        return 'bg-purple-100 text-purple-800';
      case 'PENDENTE':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold leading-5 ${getStatusColor(selectedStatus)}`}
      >
        {isPending ? 'Atualizando...' : selectedStatus}
      </span>

      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        disabled={isPending}
        className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
      >
        {orderStatusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
}