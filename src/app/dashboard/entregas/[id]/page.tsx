import { getOrderById } from '../actions';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Badge } from '@/components/ui/badge';
import UpdateDeliveryForm from './UpdateDeliveryForm';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Truck, User, Home, Calendar, Hash, Box } from 'lucide-react';
import Link from 'next/link';
import { OrderWithCustomer } from '@/types';

interface PageProps {
    params: { id: string };
}

export default async function DetalhesEntregaPage({ params }: PageProps) {
    const { id } = params;
    const order: OrderWithCustomer | null = await getOrderById(id);

    if (!order) {
        notFound();
    }

    // Constrói o endereço de entrega a partir dos campos do cliente
    const shippingAddress = [
        `${order.customer.street}, ${order.customer.number}`,
        order.customer.complement,
        order.customer.neighborhood,
        `${order.customer.city} - ${order.customer.cep || ''}`
    ].filter(Boolean).join(', ');


    return (
        <div className="max-w-7xl mx-auto p-8">
            <Breadcrumbs
                items={[
                    { label: 'Entregas', href: '/dashboard/entregas' },
                    { label: `Detalhes da Entrega #${order.id.substring(0, 8)}`, href: `/dashboard/entregas/${id}` },
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                 {/* Coluna Principal */}
                <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-md">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                             <div className="flex items-center gap-3">
                                <Truck className="text-gray-600" size={24}/>
                                <h1 className="text-3xl font-bold text-gray-800">Detalhes da Entrega</h1>
                             </div>
                             <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <Hash size={14}/> {order.id}
                            </p>
                        </div>
                        <Badge variant={(order as any).deliveryStatus}>{(order as any).deliveryStatus}</Badge>
                    </div>

                    <div className="space-y-6">
                         {/* Informações do Cliente */}
                        <div>
                             <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><User size={18}/>Informações do Cliente</h3>
                             <div className="text-sm text-gray-600 mt-2 pl-6 border-l-2 ml-2">
                                <p><strong>Nome:</strong> {order.customer.name}</p>
                                <p><strong>Email:</strong> {(order.customer as any).email || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Endereço de Entrega */}
                        <div>
                             <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><Home size={18}/>Endereço de Entrega</h3>
                             <address className="text-sm text-gray-600 mt-2 pl-6 border-l-2 ml-2 not-italic">
                                {order.customer.street}, {order.customer.number}{order.customer.complement ? `, ${order.customer.complement}` : ''}<br />
                                {order.customer.neighborhood}, {order.customer.city}<br />
                                {order.customer.cep && `CEP: ${order.customer.cep}`}
                            </address>
                        </div>

                        {/* Detalhes do Pedido Associado */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><Box size={18}/>Pedido Associado</h3>
                             <div className="text-sm text-gray-600 mt-2 pl-6 border-l-2 ml-2">
                                <p><strong>ID do Pedido:</strong> <Link href={`/dashboard/vendas/${order.id}`} className="text-blue-600 hover:underline">{order.id}</Link></p>
                                <p><strong>Valor Total:</strong> {formatCurrency(Number(Number(order.netValue)))}</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Lateral */}
                <div className="bg-white p-8 rounded-xl shadow-md h-fit">
                     <h2 className="text-xl font-semibold text-gray-800 mb-6">Gerenciar Entrega</h2>
                     <div className="space-y-4 mb-6">
                        
                         <div className="text-sm">
                            <p className="font-medium text-gray-500">Última Atualização</p>
                            <p className="text-gray-800">{formatDateTime(order.updatedAt)}</p>
                        </div>
                     </div>
                     <UpdateDeliveryForm delivery={order} />
                </div>
            </div>
        </div>
    );
}
