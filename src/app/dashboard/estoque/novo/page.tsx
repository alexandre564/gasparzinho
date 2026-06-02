import ProductForm from '../ProductForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { requirePageAccess } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export default async function NovoProdutoPage() {
  await requirePageAccess(['ADMIN', 'VENDEDOR']);

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Adicionar novo produto</CardTitle>
        <CardDescription>Preencha os detalhes abaixo para cadastrar um novo item no estoque.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm />
      </CardContent>
    </Card>
  );
}
