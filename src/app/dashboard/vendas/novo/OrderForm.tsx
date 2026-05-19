'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useState, useMemo } from 'react';

import { createOrder, getCustomersForSelect, getProductsForSelect, OrderFormState } from '../actions';
import { OrderStatus } from '@/types/enums';
import { PaymentMethod } from '@prisma/client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Trash2, Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Tipos para os dados buscados
type CustomerSelectItem = { id: string; name: string; phone: string; };
type ProductSelectItem = { id: string; name: string; price: number; cost: number; inventory: number; };

// Schema de validação do Zod
const OrderItemSchema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  quantity: z.coerce.number().positive("A qtd deve ser positiva."),
  unitPrice: z.coerce.number(), // Preço no momento da venda
  unitCost: z.coerce.number(),  // Custo no momento da venda
});

const OrderFormSchema = z.object({
  customerId: z.string().min(1, "Selecione um cliente."),
  paymentMethod: z.nativeEnum(PaymentMethod, { errorMap: () => ({ message: "Selecione a forma de pagamento." }) }),
  orderStatus: z.nativeEnum(OrderStatus, { errorMap: () => ({ message: "Selecione o status do pedido." }) }),
  items: z.array(OrderItemSchema).min(1, "Adicione pelo menos um item ao pedido."),
});

type OrderFormValues = z.infer<typeof OrderFormSchema>;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function OrderForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSelectItem[]>([]);
  const [products, setProducts] = useState<ProductSelectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema) as any,
    defaultValues: {
      customerId: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      const [customerData, productData] = await Promise.all([
        getCustomersForSelect(),
        getProductsForSelect()
      ]);
      setCustomers(customerData);
      setProducts(productData);
      setIsLoading(false);
    }
    loadInitialData();
  }, []);

  const { grossValue, totalCost, netValue } = useMemo(() => {
    const totals = watchedItems.reduce((acc, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const unitCost = Number(item.unitCost) || 0;
        acc.grossValue += unitPrice * quantity;
        acc.totalCost += unitCost * quantity;
        return acc;
    }, { grossValue: 0, totalCost: 0 });

    return { ...totals, netValue: totals.grossValue - totals.totalCost };
  }, [watchedItems]);

  async function onSubmit(values: OrderFormValues) {
    const result = await createOrder(values);
    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/vendas');
    } else {
      toast.error(result.message);
    }
  }
  
  const handleProductChange = (productId: string, index: number) => {
      const product = products.find(p => p.id === productId);
      if (product) {
        update(index, { 
            ...fields[index], 
            productId, 
            unitPrice: product.price, 
            unitCost: product.cost 
        });
      }
  };

  if (isLoading) {
      return <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
                 <CardHeader><CardTitle>Itens do Pedido</CardTitle></CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.productId`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Produto</FormLabel>
                                                <Select onValueChange={(value) => handleProductChange(value, index)} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="mt-8">
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ productId: '', quantity: 1, unitPrice: 0, unitCost: 0 })}>
                        <PlusCircle className="h-4 w-4 mr-2"/> Adicionar Item
                    </Button>
                 </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Detalhes da Venda</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cliente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {Object.values(PaymentMethod).map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {Object.values(OrderStatus).map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Resumo Financeiro</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between"><span>Valor Bruto:</span> <span className="font-medium">{formatCurrency(grossValue)}</span></div>
                    <div className="flex justify-between"><span>Custo Total:</span> <span className="font-medium">{formatCurrency(totalCost)}</span></div>
                    <Separator/>
                    <div className="flex justify-between text-lg font-bold"><span>Valor Líquido (Lucro):</span> <span>{formatCurrency(netValue)}</span></div>
                </CardContent>
                <CardFooter>
                     <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Finalizar Venda</>}
                    </Button>
                </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
