'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { OrderStatus } from '@/types/enums';
import { Order } from '@prisma/client';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

const orderStatusOptions: OrderStatus[] = [
    'PENDENTE', 'PROCESSANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'
];

function SearchBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Reset page on new search
        if (event.target.value) {
            params.set('q', event.target.value);
        } else {
            params.delete('q');
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <Input 
            placeholder="Buscar por cliente ou ID..." 
            onChange={handleSearch}
            defaultValue={searchParams.get('q') || ''}
            className="max-w-sm"
        />
    );
}

function OrderFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get('status');

    const handleFilterChange = (status: OrderStatus | 'all') => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Reset page on new filter
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
            {orderStatusOptions.map(status => (
                <Badge 
                    key={status} 
                    onClick={() => handleFilterChange(status)} 
                    className={`cursor-pointer ${currentStatus === status ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    // @ts-ignore
                    variant={status}
                >
                    {status}
                </Badge>
            ))}
        </div>
    );
}

interface OrderClientProps {
  orders: (Order & { client: { name: string; email: string; } })[];
}

export function OrderClient({ orders }: OrderClientProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <SearchBar />
                <OrderFilters />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                     <ul className="divide-y divide-gray-200">
                        {orders.length > 0 ? orders.map(order => (
                            <li key={order.id} className="p-4 hover:bg-gray-50">
                                <Link href={`/dashboard/vendas/${order.id}`} className="block">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                        <div className="mb-2 md:mb-0">
                                            <p className="font-semibold">Pedido #{order.id.substring(0, 8)}</p>
                                            <p className="text-sm text-gray-700">Cliente: {order.client.name}</p>
                                            <p className="text-xs text-gray-500">Data: {formatDateTime(order.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-lg">{formatCurrency(Number(order.total))}</span>
                                            <Badge variant={order.status}>{order.status}</Badge>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        )) : (
                             <p className="text-center text-gray-500 py-8">Nenhum pedido encontrado.</p>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}