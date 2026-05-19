
import { notFound } from 'next/navigation';
import { getCustomerById } from '../../actions';
import CustomerForm from '../../CustomerForm';

export default async function Page({ params }: { params: { id: string } }) {
    const id = params.id;
    const customer = await getCustomerById(id);

    if (!customer) {
        notFound();
    }

    return (
        <CustomerForm customer={customer} />
    );
}
