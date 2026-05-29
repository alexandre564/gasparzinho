import { redirect } from 'next/navigation';

export default function LegacyLoyaltyRedirectPage() {
  redirect('/dashboard/fidelizacao');
}
