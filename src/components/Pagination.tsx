'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from './ui/button';
import Link from 'next/link';

interface PaginationProps {
  totalPages: number;
}

export default function Pagination({ totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <Button asChild variant="outline" size="sm" disabled={isFirstPage}>
        <Link href={createPageURL(currentPage - 1)} aria-disabled={isFirstPage}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
        </Link>
      </Button>

      <span className="text-sm font-medium">
        Página {currentPage} de {totalPages}
      </span>

      <Button asChild variant="outline" size="sm" disabled={isLastPage}>
        <Link href={createPageURL(currentPage + 1)} aria-disabled={isLastPage}>
          Próxima <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
