'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
const DeliveryStatus = { PENDENTE: 'PENDENTE', EM_TRANSITO: 'EM_TRANSITO', ENTREGUE: 'ENTREGUE', FALHA_NA_ENTREGA: 'FALHA_NA_ENTREGA', CANCELADO: 'CANCELADO', AGUARDANDO_ENVIO: 'AGUARDANDO_ENVIO', ENVIADO_AO_ENTREGADOR: 'ENVIADO_AO_ENTREGADOR', EM_ROTA: 'EM_ROTA' } as const;
type DeliveryStatus = typeof DeliveryStatus[keyof typeof DeliveryStatus];
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StatusFilter() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleFilterChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status && status !== 'TODOS') {
            params.set('status', status);
        } else {
            params.delete('status');
        }
        params.set('page', '1'); // Reset to first page
        replace(`${pathname}?${params.toString()}`);
    }

    return (
         <Select onValueChange={handleFilterChange} defaultValue={searchParams.get('status') || 'TODOS'}>
            <SelectTrigger className="w-[180px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                {Object.values(DeliveryStatus).map(status => (
                    <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
