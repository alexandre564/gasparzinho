'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  MapPinned,
  MessageCircle,
  Navigation,
  PlusCircle,
  Save,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';

import { getDriverWhatsappNumber } from '../../configuracoes/actions';
import { labelFrom, paymentMethodLabels } from '@/lib/labels';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { fetchAddressByCep, normalizeCep } from '@/lib/cep';
import { buildGoogleMapsUrl, buildWazeUrl } from '@/lib/maps';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

type CustomerSelectItem = {
  id: string;
  name: string;
  phone: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  cep?: string | null;
  reference?: string | null;
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

const orderStatusOptions = [OrderStatus.PENDENTE, OrderStatus.CONFIRMADO];
const orderCreationStatusLabels: Record<string, string> = {
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
  deliveryAddress: z.string().optional(),
  deliveryReference: z.string().optional(),
  deliveryAddressChanged: z.boolean(),
  saveDeliveryAddressToCustomer: z.boolean(),
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
  const [deliveryCep, setDeliveryCep] = useState('');
  const [isDeliveryCepLoading, setDeliveryCepLoading] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues: {
      customerId: initialCustomerId,
      paymentMethod: PaymentMethod.DINHEIRO,
      paymentDueDate: '',
      orderStatus: OrderStatus.PENDENTE,
      deliveryAddress: '',
      deliveryReference: '',
      deliveryAddressChanged: false,
      saveDeliveryAddressToCustomer: false,
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
  const deliveryAddressChanged = form.watch('deliveryAddressChanged');

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

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const defaultDeliveryAddress = selectedCustomer
    ? [
        `${selectedCustomer.street}, ${selectedCustomer.number}`,
        selectedCustomer.complement,
        selectedCustomer.neighborhood,
        selectedCustomer.city,
        selectedCustomer.cep ? `CEP ${selectedCustomer.cep}` : null,
      ]
        .filter(Boolean)
        .join(' - ')
    : '';
  const effectiveDeliveryAddress = deliveryAddressChanged
    ? form.watch('deliveryAddress') || defaultDeliveryAddress
    : defaultDeliveryAddress;

  useEffect(() => {
    form.setValue('deliveryAddress', defaultDeliveryAddress);
    form.setValue('deliveryReference', selectedCustomer?.reference ?? '');
    form.setValue('deliveryAddressChanged', false);
    form.setValue('saveDeliveryAddressToCustomer', false);
    setDeliveryCep('');
  }, [defaultDeliveryAddress, form, selectedCustomer?.reference]);

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
        `Olá ${selectedCustomer.name}, seu pedido na Gás Gasparzinho foi registrado e será separado para entrega. Total: ${formatCurrency(grossValue)}.`,
      )
    : '#';

  const driverMessage = selectedCustomer
    ? `Nova entrega Gás Gasparzinho\nCliente: ${selectedCustomer.name}\nTelefone: ${selectedCustomer.phone}\nItens: ${selectedItemsSummary || 'Ver pedido no sistema'}\nTotal: ${formatCurrency(grossValue)}`
    : 'Nova entrega Gás Gasparzinho. Confira os detalhes do pedido no sistema.';
  const customerWhatsappWithAddress = selectedCustomer
    ? buildWhatsAppUrl(
        selectedCustomer.phone,
        [
          `Ola ${selectedCustomer.name}, seu pedido na Gas Gasparzinho foi registrado e sera separado para entrega.`,
          `Total: ${formatCurrency(grossValue)}.`,
          effectiveDeliveryAddress ? `Endereco de entrega: ${effectiveDeliveryAddress}.` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      )
    : customerWhatsapp;
  const googleMapsUrl = buildGoogleMapsUrl(effectiveDeliveryAddress);
  const wazeUrl = buildWazeUrl(effectiveDeliveryAddress);
  const driverMessageWithAddress = selectedCustomer
    ? [
        'Nova entrega Gas Gasparzinho',
        `Cliente: ${selectedCustomer.name}`,
        `Telefone: ${selectedCustomer.phone}`,
        `Endereco: ${effectiveDeliveryAddress || 'Ver cadastro do cliente'}`,
        form.watch('deliveryReference') ? `Referencia: ${form.watch('deliveryReference')}` : null,
        effectiveDeliveryAddress ? `Google Maps: ${googleMapsUrl}` : null,
        effectiveDeliveryAddress ? `Waze: ${wazeUrl}` : null,
        deliveryAddressChanged ? 'Atencao: entrega em endereco diferente do cadastro.' : null,
        `Itens: ${selectedItemsSummary || 'Ver pedido no sistema'}`,
        `Total: ${formatCurrency(grossValue)}`,
      ]
        .filter(Boolean)
        .join('\n')
    : driverMessage;
  const driverWhatsappUrl = buildWhatsAppUrl(driverWhatsapp, driverMessageWithAddress);

  async function handleAlternateDeliveryCepSearch() {
    const cep = normalizeCep(deliveryCep);

    if (cep.length !== 8) {
      toast.error('Informe um CEP com 8 dígitos.');
      return;
    }

    try {
      setDeliveryCepLoading(true);
      const address = await fetchAddressByCep(cep);
      const formattedAddress = [
        address.street ? `${address.street}, número` : '',
        address.neighborhood,
        address.city && address.state ? `${address.city}/${address.state}` : address.city,
        `CEP ${address.cep}`,
      ]
        .filter(Boolean)
        .join(' - ');

      form.setValue('deliveryAddress', formattedAddress);
      form.setValue('deliveryAddressChanged', true);
      toast.success('Endereço de entrega preenchido. Confira o número antes de finalizar.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao buscar CEP. Tente novamente.');
    } finally {
      setDeliveryCepLoading(false);
    }
  }

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
            Agora você pode avisar o cliente, encaminhar a entrega e acompanhar o andamento.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild className="gap-2" disabled={!selectedCustomer}>
              <a href={customerWhatsappWithAddress} target="_blank" rel="noreferrer">
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
            <Button asChild className="gap-2" variant="outline">
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir entrega no Google Maps">
                <MapPinned className="h-4 w-4" />
                Maps
              </a>
            </Button>
            <Button asChild className="gap-2" variant="outline">
              <a href={wazeUrl} target="_blank" rel="noreferrer" aria-label="Abrir entrega no Waze">
                <Navigation className="h-4 w-4" />
                Waze
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

                {selectedCustomer ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Endereco de entrega
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {effectiveDeliveryAddress || 'Endereco nao informado no cadastro.'}
                    </p>
                    {form.watch('deliveryReference') ? (
                      <p className="mt-1 text-xs text-slate-600">
                        Referencia: {form.watch('deliveryReference')}
                      </p>
                    ) : null}
                    {deliveryAddressChanged ? (
                      <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                        Entrega em endereco diferente do cadastro.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <FormField
                  control={form.control}
                  name="deliveryAddressChanged"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-slate-200 p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          aria-label="Entregar em outro endereco"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Entregar em outro endereco</FormLabel>
                        <p className="text-xs text-slate-500">
                          Use quando o cliente pedir entrega fora do endereco padrao.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {deliveryAddressChanged ? (
                  <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="alternate-delivery-cep"
                        className="text-sm font-medium text-slate-900"
                      >
                        CEP do outro endereço
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="alternate-delivery-cep"
                          value={deliveryCep}
                          onChange={(event) => setDeliveryCep(event.target.value)}
                          onBlur={(event) => {
                            if (normalizeCep(event.target.value).length === 8) {
                              void handleAlternateDeliveryCepSearch();
                            }
                          }}
                          inputMode="numeric"
                          placeholder="37200-000"
                          disabled={isDeliveryCepLoading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={handleAlternateDeliveryCepSearch}
                          disabled={isDeliveryCepLoading}
                          aria-label="Buscar outro endereço pelo CEP"
                          title="Buscar outro endereço pelo CEP"
                        >
                          <Search className="h-4 w-4" />
                          {isDeliveryCepLoading ? 'Buscando...' : 'Buscar CEP'}
                        </Button>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Novo endereco de entrega</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Rua, numero, bairro, cidade e complemento"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryReference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referencia para entrega</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: portao azul, proximo a padaria" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="saveDeliveryAddressToCustomer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 rounded-md bg-white p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                              aria-label="Salvar novo endereco no cadastro do cliente"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Salvar este endereco no cadastro do cliente</FormLabel>
                            <p className="text-xs text-slate-500">
                              Marque apenas se este sera o novo endereco padrao do cliente.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}

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
                              {labelFrom(paymentMethodLabels, method)}
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
                              {labelFrom(orderCreationStatusLabels, status)}
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
                  <span>Valor líquido:</span>
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
