'use client';

import { useFormStatus } from 'react-dom';
import { updateOrderStatus } from '../actions';
import { OrderStatus } from "@/types/enums";

interface UpdateStatusFormProps {
    orderId: string;
    currentStatus: OrderStatus;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button 
            type="submit" 
            disabled={pending} 
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        >
            {pending ? 'Atualizando...' : 'Atualizar Status'}
        </button>
    );
}

export default function UpdateStatusForm({ orderId, currentStatus }: UpdateStatusFormProps) {
    const updateStatusWithId = updateOrderStatus.bind(null, orderId);

    return (
        <form action={updateStatusWithId} className="flex items-center gap-4">
            <select 
                name="status"
                defaultValue={currentStatus}
                className="block w-full max-w-xs rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
                {Object.values(OrderStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
            <SubmitButton />
        </form>
    );
}
