import OrderForm from './OrderForm';

export default function CreateOrderPage({
  searchParams,
}: {
  searchParams?: { customerId?: string };
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nova Venda</h1>
      <OrderForm initialCustomerId={searchParams?.customerId} />
    </div>
  );
}