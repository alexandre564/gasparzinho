'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { DebtStatus } from '@prisma/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StatusFilter() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleFilterChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Reset to first page

        if (status && status !== 'TODOS') {
            params.set('status', status);
        } else {
            params.delete('status');
        }
        
        replace(`${pathname}?${params.toString()}`);
    }

    return (
         <Select onValueChange={handleFilterChange} defaultValue={searchParams.get('status') || 'TODOS'}>
            <SelectTrigger className="w-[180px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                {Object.values(DebtStatus).map(status => (
                    <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
