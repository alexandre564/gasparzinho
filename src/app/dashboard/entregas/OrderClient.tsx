'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Order, Customer } from "@prisma/client";
const DeliveryStatus = { PENDENTE: "PENDENTE", EM_TRANSITO: "EM_TRANSITO", ENTREGUE: "ENTREGUE", FALHA_NA_ENTREGA: "FALHA_NA_ENTREGA", CANCELADO: "CANCELADO" } as const;
type DeliveryStatus = typeof DeliveryStatus[keyof typeof DeliveryStatus]; 
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

const deliveryStatusOptions: string[] = [
    'AGUARDANDO_ENVIO',
    'ENVIADO_AO_ENTREGADOR',
    'EM_ROTA',
    'ENTREGUE',
    'CANCELADA'
];

function SearchBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const params = new URLSearchParams(searchParams);
        if (event.target.value) {
            params.set('q', event.target.value);
        } else {
            params.delete('q');
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <Input 
            placeholder="Buscar por cliente, ID ou código de rastreio..." 
            onChange={handleSearch}
            defaultValue={searchParams.get('q') || ''}
            className="max-w-sm"
        />
    );
}

function DeliveryFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get('status');

    const handleFilterChange = (status: DeliveryStatus | 'all') => {
        const params = new URLSearchParams(searchParams);
        if (status === 'all') {
            params.delete('status');
        } else {
            params.set('status', status);
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Badge 
                onClick={() => handleFilterChange('all')} 
                className={`cursor-pointer ${!currentStatus ? 'ring-2 ring-primary' : ''}`}
                variant={!currentStatus ? 'default' : 'secondary'}
            >
                Todos
            </Badge>
            {deliveryStatusOptions.map(status => (
                <Badge 
                    key={status} 
                    onClick={() => handleFilterChange(status as any)} 
                    className={`cursor-pointer ${currentStatus === status ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    variant={currentStatus === status ? 'default' : 'secondary'}
                >
                    {status.replace(/_/g, ' ')}
                </Badge>
            ))}
        </div>
    );
}

interface OrderClientProps {
  orders: (Order & { customer: Customer })[];
}

export function OrderClient({ orders }: OrderClientProps) {

    const formatAddress = (customer: Customer) => {
        return `${customer.street}, ${customer.number}, ${customer.neighborhood}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <SearchBar />
                <DeliveryFilters />
            </div>

            <div className="bg-white rounded-xl shadow-md">
                <CardHeader>
                    <CardTitle>Entregas</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="divide-y divide-gray-200">
                        {orders.length > 0 ? orders.map(order => (
                            <Link href={`/dashboard/entregas/${order.id}`} key={order.id} className="block p-4 hover:bg-gray-50">
                                <li className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    <div className="mb-2 md:mb-0">
                                        <p className="font-semibold text-gray-800">Cliente: {order.customer.name}</p>
                                        <p className="text-sm text-gray-600">Endereço: {formatAddress(order.customer)}</p>
                                        <p className="text-xs text-gray-400 mt-1">Criado em: {formatDateTime(order.createdAt)}</p>
                                    </div>
                                     <Badge variant={
                                         (order as any).deliveryStatus === 'ENTREGUE' ? 'default' : 
                                         (order as any).deliveryStatus === 'CANCELADA' ? 'destructive' : 
                                         'secondary'
                                     }>
                                         {(order as any).deliveryStatus.replace(/_/g, ' ')}
                                     </Badge>
                                </li>
                             </Link>
                        )) : (
                            <p className="text-center text-gray-500 py-8">Nenhuma entrega encontrada.</p>
                        )}
                    </ul>
                </CardContent>
            </div>
        </div>
    );
}
