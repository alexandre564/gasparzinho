import { notFound } from 'next/navigation';
import { getProduct } from '../../actions';
import ProductForm from '../../ProductForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


export const dynamic = 'force-dynamic';
export default async function EditarProdutoPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  return (
    <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle>Editar Produto</CardTitle>
            <CardDescription>Atualize os detalhes do produto e o estoque.</CardDescription>
        </CardHeader>
        <CardContent>
             <ProductForm product={product} />
        </CardContent>
    </Card>
  );
}
