'use client';

import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Product } from '@prisma/client';
import { Loader2, Save } from 'lucide-react';

import { ProductCategory, StockKind } from '@/types/enums';
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
import { Textarea } from '@/components/ui/textarea';
import { productCategoryLabels, stockKindLabels } from '@/lib/labels';
import { createProduct, ProductFormState, updateProduct } from './actions';

const ProductFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  description: z.string().optional(),
  price: z.coerce.number().positive('O preço de venda deve ser positivo.'),
  cost: z.coerce.number().nonnegative('O custo não pode ser negativo.'),
  category: z.nativeEnum(ProductCategory),
  stockKind: z.nativeEnum(StockKind),
  inventory: z.coerce.number().int().nonnegative('O estoque não pode ser negativo.').default(0),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

interface ProductFormProps {
  product?: Product | null;
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema) as unknown as Resolver<ProductFormValues>,
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price ? Number(product.price) : 0,
      cost: product?.cost ? Number(product.cost) : 0,
      category: (product?.category as ProductCategory) || ProductCategory.BOTIJAO,
      stockKind: (product?.stockKind as StockKind) || StockKind.UNIDADE,
      inventory: product?.inventory || 0,
    },
  });

  const onSubmit = async (values: ProductFormValues) => {
    let result: ProductFormState;

    if (isEditMode && product) {
      result = await updateProduct(product.id, values);
    } else {
      result = await createProduct(values);
    }

    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/estoque');
      return;
    }

    toast.error(result.message);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Editar produto' : 'Novo produto'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do produto</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Botijão de gás P13" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detalhes sobre o produto..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preco de venda</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preco de custo</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(ProductCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {productCategoryLabels[category] ?? category}
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
                name="stockKind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de estoque</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(StockKind).map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {stockKindLabels[kind] ?? kind}
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
                name="inventory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditMode ? 'Ajustar saldo' : 'Saldo inicial'}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar produto
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
