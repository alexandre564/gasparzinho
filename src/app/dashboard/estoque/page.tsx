
import { Suspense } from 'react';
import Link from 'next/link';
import { PlusCircle, Loader2 } from 'lucide-react';

import { getPaginatedProducts } from './actions';


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import {Search} from '@/components/Search';
import DeleteProductButton from './DeleteProductButton';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StockStatus = ({ product }: { product: { inventory: number, category: string, full: number | null, empty: number | null } }) => {
    if (product.category === 'BOTIJAO_GAS') {
        return (
            <div className="flex flex-col">
                <span className="font-semibold">Cheios: {product.full}</span>
                <span className="text-xs text-muted-foreground">Vazios: {product.empty}</span>
            </div>
        );
    }

    const isCritical = product.inventory <= 5;
    return (
        <Badge variant={isCritical ? 'destructive' : 'outline'}>
            {product.inventory} Unidades {isCritical && "(Crítico)"}
        </Badge>
    );
};

export default async function StockPage({ searchParams }: { searchParams?: { query?: string; page?: string; category?: string; } }) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const category = searchParams?.category;

  const { products, totalPages } = await getPaginatedProducts(query, currentPage, category);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque</h1>
         <Link href="/dashboard/estoque/novo">
            <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Produto</span>
            </Button>
        </Link>
      </div>

      <Card>
         <CardHeader>
            <CardTitle>Gerenciamento de Produtos</CardTitle>
            <CardDescription>Adicione, edite e controle o estoque dos seus produtos.</CardDescription>
             <div className="pt-4 flex items-center gap-4">
                <Search placeholder="Buscar por nome..." />
                {/* TODO: Adicionar filtro de categoria */}
            </div>
        </CardHeader>
        <CardContent>
             <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-center">Saldo/Status</TableHead>
                            <TableHead className="text-right">Preço Venda</TableHead>
                            <TableHead className="hidden md:table-cell text-right">Preço Custo</TableHead>
                            <TableHead><span className="sr-only">Ações</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length > 0 ? products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
                                <TableCell className="text-center"><StockStatus product={product as any} /></TableCell>
                                <TableCell className="text-right">{formatCurrency(Number(product.price))}</TableCell>
                                <TableCell className="hidden md:table-cell text-right">{formatCurrency(Number(product.cost))}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/dashboard/estoque/${product.id}/editar`}>
                                            <Button variant="outline" size="sm">Editar</Button>
                                        </Link>
                                        <DeleteProductButton id={product.id} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                               <TableCell colSpan={6} className="h-24 text-center">Nenhum produto encontrado.</TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </Suspense>
        </CardContent>
      </Card>

       <div className="flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
