import { prisma } from '@/lib/prisma';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function createUser(formData: FormData) {
    'use server'
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const accessLevel = formData.get('accessLevel') as string;

    if (!name || !email || !accessLevel) {
        // Handle missing fields appropriately
        return;
    }

    try {
        await prisma.user.create({
            data: {
                name,
                email,
                accessLevel,
                password: 'temporary-password', // TODO: Implement proper password creation
            },
        });
    } catch (error) {
        console.error('Error creating user:', error);
        // Handle errors, e.g., user already exists
    }

    revalidatePath('/dashboard/equipe');
    redirect('/dashboard/equipe');
}

export default function NovoMembroPage() {
    return (
        <div className="max-w-xl mx-auto p-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Adicionar Novo Membro</h1>
                
                <form action={createUser} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                        <input type="text" name="name" id="name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" id="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="accessLevel" className="block text-sm font-medium text-gray-700">Nível de Acesso</label>
                        <select name="accessLevel" id="accessLevel" defaultValue={''} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                            {['ADMIN','GERENTE','VENDEDOR','OPERADOR'].map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">Adicionar Membro</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
