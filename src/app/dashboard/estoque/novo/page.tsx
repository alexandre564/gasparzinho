import ProductForm from '../ProductForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


export const dynamic = 'force-dynamic';
export default function NovoProdutoPage() {
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Adicionar Novo Produto</CardTitle>
                <CardDescription>Preencha os detalhes abaixo para cadastrar um novo item no estoque.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProductForm />
            </CardContent>
        </Card>
    );
}
