'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import { Loader2, PlusCircle, Save, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
const orderStatusOptions = Object.values(OrderStatus);

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  quantity: z.number().positive('A qtd deve ser positiva.'),
  unitPrice: z.number(),
  unitCost: z.number(),
});

const OrderFormSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente.'),
  paymentMethod: z.string().min(1, 'Selecione a forma de pagamento.'),
  orderStatus: z.string().min(1, 'Selecione o status do pedido.'),
  items: z.array(OrderItemSchema).min(1, 'Adicione pelo menos um item ao pedido.'),
});

type OrderFormValues = z.infer<typeof OrderFormSchema>;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export default function OrderForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSelectItem[]>([]);
  const [products, setProducts] = useState<ProductSelectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues: {
      customerId: '',
      paymentMethod: '',
      orderStatus: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);

        const [customerData, productData] = await Promise.all([
          getCustomersForSelect(),
          getProductsForSelect(),
        ]);

        setCustomers(customerData);
        setProducts(productData);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar dados do formulário.');
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

  async function onSubmit(values: OrderFormValues) {
    const result = await createOrder(values);

    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/vendas');
      return;
    }

    toast.error(result.message);
  }

  function handleProductChange(productId: string, index: number) {
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    update(index, {
      ...form.getValues(`items.${index}`),
      productId,
      unitPrice: product.price,
      unitCost: product.cost,
      quantity: form.getValues(`items.${index}.quantity`) || 1,
    });
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
                <CardTitle>Itens do Pedido</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto</FormLabel>
                              <Select
                                onValueChange={(value) => handleProductChange(value, index)}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>

                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
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
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value ?? 1}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
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
                  Adicionar Item
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Venda</CardTitle>
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
                              {customer.name}
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
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
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
                  name="orderStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Pedido</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {orderStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
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
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Valor Bruto:</span>
                  <span className="font-medium">{formatCurrency(grossValue)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Custo Total:</span>
                  <span className="font-medium">{formatCurrency(totalCost)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Valor Líquido (Lucro):</span>
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
                      Finalizar Venda
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