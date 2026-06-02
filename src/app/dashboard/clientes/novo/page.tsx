import CustomerForm from '../CustomerForm';
import { requirePageAccess } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requirePageAccess(['ADMIN', 'VENDEDOR']);

  return <CustomerForm />;
}
