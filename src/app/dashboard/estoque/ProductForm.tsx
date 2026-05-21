'use client';
import { StockKind, ProductCategory } from '@/types/enums';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Product } from '@prisma/client';

import { createProduct, updateProduct, ProductFormState } from './actions';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from 'lucide-react';

// Zod Schema para validaÃ§Ã£o do formulÃ¡rio
const ProductFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mÃ­nimo 3 caracteres."),
  description: z.string().optional(),
  price: z.coerce.number().positive("O preÃ§o de venda deve ser positivo."),
  cost: z.coerce.number().nonnegative("O custo nÃ£o pode ser negativo."),
  category: z.nativeEnum(ProductCategory),
  stockKind: z.nativeEnum(StockKind),
  inventory: z.coerce.number().int().nonnegative("O estoque nÃ£o pode ser negativo.").default(0),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

interface ProductFormProps {
  product?: Product | null;
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema) as any,
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price? Number(product.price) : 0,
      cost: product?.cost ? Number(product.cost) : 0,
      category: product?.category as any,
      stockKind: product?.stockKind as any,
      inventory: product?.inventory || 0,
    },
  });

  const onSubmit = async (values: ProductFormValues) => {
    let result: ProductFormState;
    if (isEditMode) {
        result = await updateProduct(product.id, values);
    } else {
        result = await createProduct(values);
    }

    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/estoque');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader><CardTitle>{isEditMode ? 'Editar Produto' : 'Novo Produto'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Produto</FormLabel>
                        <FormControl><Input {...field} placeholder="Ex: BotijÃ£o de GÃ¡s P13" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>DescriÃ§Ã£o (Opcional)</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Detalhes sobre o produto..." /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>PreÃ§o de Venda</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>PreÃ§o de Custo</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                         {['GAS','AGUA','OUTROS'].map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="stockKind"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Estoque</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {Object.values(StockKind).map(kind => <SelectItem key={kind} value={kind}>{kind}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="inventory"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{isEditMode ? 'Ajustar Saldo' : 'Saldo Inicial'}</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4"/> Salvar Produto</>}
            </Button>
        </div>
      </form>
    </Form>
  );
}
