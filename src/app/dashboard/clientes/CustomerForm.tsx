'use client';

import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Customer } from '@prisma/client';
import { createCustomer, updateCustomer } from './actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CustomerFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome precisa ter pelo menos 3 caracteres.' }),
  phone: z.string().min(10, { message: 'O telefone precisa ser válido.' }),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().min(1, { message: 'O número é obrigatório.' }),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().default('Lavras'),
  reference: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

async function fetchCep(cep: string, form: ReturnType<typeof useForm<CustomerFormValues>>) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error('CEP não encontrado');
    const data = await response.json();
    if (data.erro) {
      toast.error('CEP não encontrado. Verifique o número.');
      return;
    }
    form.setValue('street', data.logradouro);
    form.setValue('neighborhood', data.bairro);
    form.setValue('city', data.localidade);
    form.setFocus('number');
  } catch {
    toast.error('Falha ao buscar CEP. Tente novamente.');
  }
}

export default function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const isUpdate = !!customer?.id;
  const [isCepLoading, setCepLoading] = useState(false);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormSchema) as unknown as Resolver<CustomerFormValues>,
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      cep: customer?.cep || '',
      street: customer?.street || '',
      number: customer?.number || '',
      complement: customer?.complement || '',
      neighborhood: customer?.neighborhood || '',
      city: customer?.city || 'Lavras',
      reference: customer?.reference || '',
    },
  });

  const handleCepBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
    const cep = event.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      await fetchCep(cep, form);
      setCepLoading(false);
    }
  };

  async function onSubmit(values: CustomerFormValues) {
    const action = isUpdate ? updateCustomer.bind(null, customer.id) : createCustomer;
    const result = await action(values);

    if (result.success) {
      toast.success(result.message);

      if (!isUpdate && result.customerId) {
        setCreatedCustomerId(result.customerId);
        return;
      }

      router.push('/dashboard/clientes');
      return;
    }

    toast.error(result.message);
  }

  if (createdCustomerId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cliente cadastrado</CardTitle>
          <CardDescription>Agora você pode iniciar o primeiro pedido deste cliente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button className="gap-2" onClick={() => router.push(`/dashboard/vendas/novo?customerId=${createdCustomerId}`)}>
            Fazer primeiro pedido
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/clientes')}>
            Voltar para clientes
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setCreatedCustomerId(null);
              form.reset({
                name: '',
                phone: '',
                cep: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: 'Lavras',
                reference: '',
              });
            }}
          >
            Cadastrar outro cliente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isUpdate ? 'Editar cliente' : 'Novo cliente'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone / WhatsApp</FormLabel>
                  <FormControl><Input placeholder="(35) 99999-9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-3">
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl><Input placeholder="37200-000" {...field} onBlur={handleCepBlur} disabled={isCepLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {isCepLoading && <p className="col-span-2 text-sm text-muted-foreground">Buscando CEP...</p>}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
              <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem className="md:col-span-4">
                  <FormLabel>Rua</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="number" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Número</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField control={form.control} name="complement" render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl><Input placeholder="Casa, Apartamento, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ponto de referência</FormLabel>
                  <FormControl><Input placeholder="Próximo a..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Salvando...' : (isUpdate ? 'Salvar alterações' : 'Cadastrar cliente')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
