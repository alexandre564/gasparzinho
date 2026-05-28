import Link from 'next/link';
import { Download, Pencil, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { CategoryFilter } from './CategoryFilter';
import DeleteProductButton from './DeleteProductButton';
import ImportProductsButton from './ImportProductsButton';
import { getPaginatedProducts } from './actions';


export const dynamic = 'force-dynamic';
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function StockBadge({ inventory }: { inventory: number }) {
  if (inventory <= 5) {
    return <Badge variant="destructive">{inventory} unidades</Badge>;
  }

  if (inventory <= 10) {
    return <Badge className="bg-amber-500 text-white">{inventory} unidades</Badge>;
  }

  return <Badge variant="secondary">{inventory} unidades</Badge>;
}

export default async function StockPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string; category?: string };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const category = searchParams?.category;
  const { products, totalPages } = await getPaginatedProducts(query, currentPage, category);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Estoque</h2>
          <p className="text-sm text-muted-foreground">
            Controle saldos, custos e preços dos produtos vendidos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href="/api/estoque/exportar" download>
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href="/api/estoque/modelo" download>
              <Download className="h-4 w-4" />
              Modelo CSV
            </a>
          </Button>
          <ImportProductsButton />
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/estoque/novo">
              <PlusCircle className="h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Produtos</CardTitle>
            <CardDescription>
              Busque por nome ou filtre por categoria para conferir o estoque.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Search placeholder="Buscar por nome..." />
            <CategoryFilter />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Custo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground">{product.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StockBadge inventory={product.inventory} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(product.price))}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground">
                        {formatCurrency(Number(product.cost))}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link href={`/dashboard/estoque/${product.id}/editar`}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Link>
                          </Button>
                          <DeleteProductButton id={product.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="mx-auto max-w-sm space-y-2">
                        <p className="font-medium">Nenhum produto encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          Cadastre produtos para liberar vendas e controle de entregas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  );
}
