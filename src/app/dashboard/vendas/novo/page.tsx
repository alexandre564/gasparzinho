import OrderForm from './OrderForm';
import { requirePageAccess } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export default async function CreateOrderPage({
  searchParams,
}: {
  searchParams?: { customerId?: string };
}) {
  await requirePageAccess(['ADMIN', 'VENDEDOR']);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nova Venda</h1>
      <OrderForm initialCustomerId={searchParams?.customerId} />
    </div>
  );
}
