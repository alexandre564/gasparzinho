import { getTeamMembers } from './actions';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function TeamPage() {
    // TODO: Adicionar tratamento de erro caso a busca falhe
    const members = await getTeamMembers();

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Gestão de Equipe</h1>
                    <p className="text-sm text-muted-foreground">Visualize e gerencie os membros da sua equipe.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/equipe/novo">Adicionar Membro</Link>
                </Button>
            </div>
            {/* 
                A propriedade `members` do objeto retornado por `getTeamMembers` 
                não é do tipo `User[]`, mas sim `any[]`. 
                Adicione o tipo correto para a variável `members`.
            */}
            <DataTable columns={columns} data={members} />
        </div>
    );
}
