import { prisma } from '@/lib/prisma';
import { EditForm } from './EditForm';
import { notFound } from 'next/navigation';

// This is a server component
export default async function EditUserPage({ params }: { params: { id: string } }) {
    const user = await prisma.user.findUnique({
        where: { id: params.id },
    });

    if (!user) {
        notFound();
    }

    return (
        <div className="max-w-xl mx-auto p-8">
             <div className="bg-white p-8 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Editar Membro da Equipe</h1>
                <EditForm user={user as any} />
             </div>
        </div>
    );
}
