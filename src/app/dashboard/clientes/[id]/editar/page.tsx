
import { notFound } from 'next/navigation';
import { getCustomerById } from '../../actions';
import CustomerForm from '../../CustomerForm';
import { requirePageAccess } from '@/lib/page-auth';


export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: { id: string } }) {
    await requirePageAccess(['ADMIN', 'VENDEDOR']);

    const id = params.id;
    const customer = await getCustomerById(id);

    if (!customer) {
        notFound();
    }

    return (
        <CustomerForm customer={customer} />
    );
}
