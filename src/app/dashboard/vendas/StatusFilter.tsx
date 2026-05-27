'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatus } from "@/types/enums";

export function StatusFilter() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status && status !== 'ALL') {
            params.set('status', status);
        } else {
            params.delete('status');
        }
        params.set('page', '1'); // Reset page to 1 on filter change
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <Select onValueChange={handleStatusChange} defaultValue={searchParams.get('status') || 'ALL'}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">Todos Status</SelectItem>
                <SelectItem value={OrderStatus.PENDENTE}>Pendente</SelectItem>
                <SelectItem value={OrderStatus.CONFIRMADO}>Confirmado</SelectItem>
                <SelectItem value={OrderStatus.CANCELADO}>Cancelado</SelectItem>
            </SelectContent>
        </Select>
    );
}
