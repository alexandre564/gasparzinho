'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Customer } from '@prisma/client';
import { createCustomer, updateCustomer } from './actions';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';


const CustomerFormSchema = z.object({
  name: z.string().min(3, { message: "O nome precisa ter pelo menos 3 caracteres." }),
  phone: z.string().min(10, { message: "O telefone precisa ser válido." }),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().min(1, { message: "O número é obrigatório." }),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().default('Lavras'),
  reference: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

async function fetchCep(cep: string, form: any) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado');
        const data = await response.json();
        if (data.erro) {
            toast.error("CEP não encontrado. Verifique o número.");
            return;
        }
        form.setValue('street', data.logradouro);
        form.setValue('neighborhood', data.bairro);
        form.setValue('city', data.localidade);
        form.setFocus('number');
    } catch (error) {
        toast.error("Falha ao buscar CEP. Tente novamente.");
    }
}


export default function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const isUpdate = !!customer?.id;
  const [isCepLoading, setCepLoading] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerFormSchema) as any,
    defaultValues: {
      name: customer?.name || '',
      phone: customer?.phone || '',
      cep: customer?.cep || '',
      street: customer?.street || '',
      number: customer?.number || '',
      complement: customer?.complement || '',
      neighborhood: customer?.neighborhood || '',
      city: customer?.city || 'Lavras',
      reference: customer ? (customer as any).reference || '' : '',
    },
  });

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
      const cep = e.target.value.replace(/\D/g, '');
      if (cep.length === 8) {
          setCepLoading(true);
          await fetchCep(cep, form);
          setCepLoading(false);
      }
  }

  async function onSubmit(values: CustomerFormValues) {
    const action = isUpdate 
      ? updateCustomer.bind(null, customer.id)
      : createCustomer;
    
    const result = await action(values);

    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/clientes'); 
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>{isUpdate ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <FormField control={form.control} name="cep" render={({ field }) => (
                            <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl><Input placeholder="37200-000" {...field} onBlur={handleCepBlur} disabled={isCepLoading} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         {isCepLoading && <p className="text-sm text-muted-foreground col-span-2">Buscando CEP...</p>}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
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

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="complement" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Complemento</FormLabel>
                                <FormControl><Input placeholder="Casa, Apartamento, etc."{...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="reference" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ponto de Referência</FormLabel>
                                <FormControl><Input placeholder="Próximo a..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Salvando...' : (isUpdate ? 'Salvar Alterações' : 'Cadastrar Cliente')}
                    </Button>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}
