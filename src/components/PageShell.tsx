import type { ComponentType, ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';

const toneMap: Record<Tone, { accent: string; chip: string; value: string; border: string }> = {
  emerald: {
    accent: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    value: 'text-emerald-800',
    border: 'hover:border-emerald-300',
  },
  blue: {
    accent: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 ring-sky-200',
    value: 'text-sky-800',
    border: 'hover:border-sky-300',
  },
  amber: {
    accent: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    value: 'text-amber-800',
    border: 'hover:border-amber-300',
  },
  rose: {
    accent: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    value: 'text-rose-800',
    border: 'hover:border-rose-300',
  },
  slate: {
    accent: 'bg-slate-500',
    chip: 'bg-slate-100 text-slate-700 ring-slate-300',
    value: 'text-slate-950',
    border: 'hover:border-slate-400',
  },
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <section className="motion-safe:animate-soft-slide-up overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg shadow-slate-200/80 ring-1 ring-slate-950/5">
      <div className="flex flex-col gap-4 border-l-4 border-emerald-500 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
              ) : null}
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function MetricTile({
  title,
  value,
  description,
  icon: Icon,
  tone = 'emerald',
  className,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  className?: string;
}) {
  const toneClass = toneMap[tone];

  return (
    <Card className={cn('interactive-lift relative overflow-hidden border-slate-300 bg-white shadow-slate-200/80', toneClass.border, className)}>
      <div className={cn('absolute inset-x-0 top-0 h-1', toneClass.accent)} />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-slate-200 bg-slate-50/80 pb-3">
        <CardTitle className="text-sm font-extrabold uppercase tracking-wide text-slate-950">{title}</CardTitle>
        <span className={cn('rounded-md p-2 ring-1', toneClass.chip)}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="pt-5">
        <div className={cn('metric-value text-3xl font-black tracking-tight', toneClass.value)}>{value}</div>
        {description ? <CardDescription className="mt-2 font-medium leading-5">{description}</CardDescription> : null}
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden border-slate-300', className)}>
      <CardHeader className="gap-3 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl font-black text-slate-950">{title}</CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="font-extrabold text-slate-950">{title}</p>
      {description ? <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p> : null}
    </div>
  );
}
