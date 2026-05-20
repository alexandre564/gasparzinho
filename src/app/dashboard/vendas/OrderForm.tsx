'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Customer, Product } from '@prisma/client';
import { createOrder } from './actions';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PaymentMethod = {
  DINHEIRO: 'DINHEIRO',
  PIX: 'PIX',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  CARTAO_DEBITO: 'CARTAO_DEBITO',
  FIADO: 'FIADO',
} as const;

const OrderStatus = {
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
} as const;

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.'),
  productName: z.string(),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'A quantidade mínima é 1.'),
  unitPrice: z.coerce.number(),
  unitCost: z.coerce.number(),
});

const OrderFormSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente.'),
  items: z
    .array(OrderItemSchema)
    .min(1, 'O pedido precisa ter pelo menos um item.'),
  paymentMethod: z.enum([
    PaymentMethod.DINHEIRO,
    PaymentMethod.PIX,
    PaymentMethod.CARTAO_CREDITO,
    PaymentMethod.CARTAO_DEBITO,
    PaymentMethod.FIADO,
  ]),
  orderStatus: z.enum([
    OrderStatus.PENDENTE,
    OrderStatus.CONFIRMADO,
    OrderStatus.EM_PREPARO,
    OrderStatus.PRONTO,
    OrderStatus.ENTREGUE,
    OrderStatus.CANCELADO,
  ]),
  discountValue: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
});

type OrderFormValues = z.infer<typeof OrderFormSchema>;

interface OrderFormProps {
  customers: Customer[];
  products: (Product & { price: number; cost: number })[];
}

export function OrderForm({ customers, products }: OrderFormProps) {
  const router = useRouter();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema) as any,
    defaultValues: {
      customerId: '',
      items: [],
      paymentMethod: PaymentMethod.DINHEIRO,
      orderStatus: OrderStatus.PENDENTE,
      discountValue: 0,
      amountPaid: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
    keyName: 'key',
  });

  const watchItems = form.watch('items') ?? [];
  const watchDiscount = form.watch('discountValue');

  const grossValue = watchItems.reduce(
    (acc: number, item) => acc + item.unitPrice * item.quantity,
    0,
  );
  const netValue = grossValue - watchDiscount;

  function handleAddProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product || fields.some((item) => item.productId === productId)) {
      toast.warning('Produto já adicionado ou inválido.');
      return;
    }

    append({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      unitCost: product.cost,
    });
  }

  async function onSubmit(values: OrderFormValues) {
    const result = await createOrder(values);
    if (result.success) {
      toast.success(result.message);
      router.push(`/dashboard/vendas`);
    } else {
      toast.error('Erro ao registrar venda', {
        description: result.message,
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Itens do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductSelector
                  products={products}
                  onProductSelect={handleAddProduct}
                />
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-24">Qtd.</TableHead>
                      <TableHead className="text-right">
                        Preço Unit.
                      </TableHead>
                      <TableHead className="text-right">
                        Subtotal
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.key}>
                        <TableCell>{field.productName}</TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: controllerField }) => (
                              <Input
                                type="number"
                                {...controllerField}
                                className="text-center"
                                min={1}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(field.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            field.unitPrice *
                              (watchItems[index]?.quantity ?? 0),
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {form.formState.errors.items && (
                  <p className="text-sm text-red-500 mt-2">
                    {form.formState.errors.items.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PaymentMethod).map((method) => (
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(OrderStatus).map((status) => (
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
              <CardContent className="space-y-4">
                <div className="flex justify-between font-medium">
                  <span>Valor Bruto</span>
                  <span>{formatCurrency(grossValue)}</span>
                </div>

                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="pt-2">Desconto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="w-32"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Valor Líquido</span>
                  <span>{formatCurrency(netValue)}</span>
                </div>

                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Valor Pago</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="w-32"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-between font-medium text-red-600">
                  <span>Valor em Aberto</span>
                  <span>
                    {formatCurrency(
                      netValue - form.getValues('amountPaid'),
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full text-lg py-6"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? 'Registrando...'
                : 'Registrar Venda'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function ProductSelector({
  products,
  onProductSelect,
}: {
  products: Product[];
  onProductSelect: (productId: string) => void;
}) {
  const [selected, setSelected] = useState('');

  const handleSelect = () => {
    if (selected) {
      onProductSelect(selected);
      setSelected('');
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-grow">
        <Label htmlFor="product-selector">Adicionar Produto</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="product-selector">
            <SelectValue placeholder="Selecione um produto para adicionar..." />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" onClick={handleSelect}>
        <PlusCircle className="h-4 w-4 mr-2" /> Adicionar
      </Button>
    </div>
  );
}