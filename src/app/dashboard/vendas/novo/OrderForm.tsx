'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  MessageCircle,
  PlusCircle,
  Save,
  Trash2,
  Truck,
} from 'lucide-react';

import { getDriverWhatsappNumber } from '../../configuracoes/actions';
import { createOrder, getCustomersForSelect, getProductsForSelect } from '../actions';
import { OrderStatus } from '@/types/enums';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

type CustomerSelectItem = {
  id: string;
  name: string;
  phone: string;
};

type ProductSelectItem = {
  id: string;
  name: string;
  price: number;
  cost: number;
  inventory: number;
};

const PaymentMethod = {
  DINHEIRO: 'DINHEIRO',
  PIX: 'PIX',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  CARTAO_DEBITO: 'CARTAO_DEBITO',
  FIADO: 'FIADO',
} as const;

const paymentMethods = Object.values(PaymentMethod);
const paymentMethodLabels: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartao de credito',
  CARTAO_DEBITO: 'Cartao de debito',
  FIADO: 'Fiado / a prazo',
};

const orderStatusOptions = [OrderStatus.PENDENTE, OrderStatus.CONFIRMADO];
const orderStatusLabels: Record<string, string> = {
  PENDENTE: 'Pedido feito',
  CONFIRMADO: 'Confirmado para entrega',
};

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  quantity: z.number().positive('A quantidade deve ser maior que zero.'),
  unitPrice: z.number(),
  unitCost: z.number(),
});

const OrderFormSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente.'),
  paymentMethod: z.string().min(1, 'Selecione a forma de pagamento.'),
  paymentDueDate: z.string().optional(),
  orderStatus: z.string().min(1, 'Selecione o status do pedido.'),
  items: z.array(OrderItemSchema).min(1, 'Adicione pelo menos um item ao pedido.'),
});

type OrderFormValues = z.infer<typeof OrderFormSchema>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export default function OrderForm({ initialCustomerId = '' }: { initialCustomerId?: string }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSelectItem[]>([]);
  const [products, setProducts] = useState<ProductSelectItem[]>([]);
  const [driverWhatsapp, setDriverWhatsapp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues: {
      customerId: initialCustomerId,
      paymentMethod: PaymentMethod.DINHEIRO,
      paymentDueDate: '',
      orderStatus: OrderStatus.PENDENTE,
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const selectedPaymentMethod = form.watch('paymentMethod');
  const selectedCustomerId = form.watch('customerId');

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);

        const [customerData, productData, driverWhatsappData] = await Promise.all([
          getCustomersForSelect(),
          getProductsForSelect(),
          getDriverWhatsappNumber(),
        ]);

        setCustomers(customerData);
        setProducts(productData);
        setDriverWhatsapp(driverWhatsappData);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar dados do formulario.');
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const { grossValue, totalCost, netValue } = useMemo(() => {
    const totals = watchedItems.reduce(
      (acc, item) => {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const unitCost = item.unitCost || 0;

        acc.grossValue += unitPrice * quantity;
        acc.totalCost += unitCost * quantity;

        return acc;
      },
      { grossValue: 0, totalCost: 0 },
    );

    return {
      ...totals,
      netValue: totals.grossValue - totals.totalCost,
    };
  }, [watchedItems]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);

  const selectedItemsSummary = watchedItems
    .map((item) => {
      const product = products.find((currentProduct) => currentProduct.id === item.productId);
      return product ? `${item.quantity || 0}x ${product.name}` : null;
    })
    .filter(Boolean)
    .join(', ');

  const customerWhatsapp = selectedCustomer
    ? buildWhatsAppUrl(
        selectedCustomer.phone,
        `Ola ${selectedCustomer.name}, seu pedido na Gas Gasparzinho foi registrado e sera separado para entrega. Total: ${formatCurrency(grossValue)}.`,
      )
    : '#';

  const driverMessage = selectedCustomer
    ? `Nova entrega Gas Gasparzinho\nCliente: ${selectedCustomer.name}\nTelefone: ${selectedCustomer.phone}\nItens: ${selectedItemsSummary || 'Ver pedido no sistema'}\nTotal: ${formatCurrency(grossValue)}`
    : 'Nova entrega Gas Gasparzinho. Confira os detalhes do pedido no sistema.';
  const driverWhatsappUrl = buildWhatsAppUrl(driverWhatsapp, driverMessage);

  async function onSubmit(values: OrderFormValues) {
    const result = await createOrder(values);

    if (result.success) {
      toast.success(result.message);
      setCreatedOrderId(result.orderId ?? null);
      return;
    }

    toast.error(result.message);
  }

  function handleProductChange(productId: string, index: number) {
    const product = products.find((currentProduct) => currentProduct.id === productId);

    if (!product) {
      return;
    }

    update(index, {
      ...form.getValues(`items.${index}`),
      productId,
      unitPrice: product.price,
      unitCost: product.cost,
      quantity: form.getValues(`items.${index}.quantity`) || 1,
    });
  }

  if (createdOrderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedido criado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Agora voce pode avisar o cliente, encaminhar a entrega e acompanhar o andamento.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild className="gap-2" disabled={!selectedCustomer}>
              <a href={customerWhatsapp} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                Enviar WhatsApp ao cliente
              </a>
            </Button>
            <Button asChild className="gap-2" variant="secondary">
              <a href={driverWhatsappUrl} target="_blank" rel="noreferrer">
                <Truck className="h-4 w-4" />
                Enviar ao entregador
              </a>
            </Button>
            <Button className="gap-2" variant="outline" onClick={() => router.push('/dashboard/entregas')}>
              <Truck className="h-4 w-4" />
              Ir para entregas
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/dashboard/vendas/${createdOrderId}`)}>
              Ver pedido
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Itens do pedido</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-start gap-4 rounded-lg border bg-white p-4 shadow-sm"
                    >
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field: productField }) => (
                            <FormItem>
                              <FormLabel>Produto</FormLabel>
                              <Select
                                onValueChange={(value) => handleProductChange(value, index)}
                                value={productField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>

                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                      disabled={product.inventory <= 0}
                                    >
                                      {product.name} - estoque: {product.inventory}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: quantityField }) => (
                            <FormItem>
                              <FormLabel>Quantidade</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  value={quantityField.value ?? 1}
                                  onChange={(event) => quantityField.onChange(Number(event.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        className="mt-8"
                        aria-label="Remover item"
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    append({
                      productId: '',
                      quantity: 1,
                      unitPrice: 0,
                      unitCost: 0,
                    })
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar item
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da venda</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de pagamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {paymentMethodLabels[method] ?? method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data prevista de pagamento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <p className="text-xs text-slate-500">
                        {selectedPaymentMethod === PaymentMethod.FIADO
                          ? 'Informe a data combinada com o cliente. Se ficar em branco, o sistema usa 30 dias.'
                          : 'Use quando houver prazo combinado mesmo fora do fiado.'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do pedido</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {orderStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {orderStatusLabels[status] ?? status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo financeiro</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Valor bruto:</span>
                  <span className="font-medium">{formatCurrency(grossValue)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Custo total:</span>
                  <span className="font-medium">{formatCurrency(totalCost)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Valor liquido:</span>
                  <span>{formatCurrency(netValue)}</span>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Finalizar venda
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
