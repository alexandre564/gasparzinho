'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  totalPages: number;
}

export default function Pagination({ totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;
  const safeTotalPages = Math.max(totalPages, 1);

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= safeTotalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      aria-label="Paginação"
    >
      {isFirstPage ? (
        <Button variant="outline" size="sm" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={createPageURL(currentPage - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
          </Link>
        </Button>
      )}

      <span className="order-first w-full text-center text-sm font-medium text-muted-foreground sm:order-none sm:w-auto">
        Página {currentPage} de {safeTotalPages}
      </span>

      {isLastPage ? (
        <Button variant="outline" size="sm" disabled>
          Próxima <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={createPageURL(currentPage + 1)}>
            Próxima <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    </nav>
  );
}
