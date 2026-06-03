export type DebtPaymentBreakdown = {
  paidAmount: number | null;
  remainingValue: number | null;
};

const closedDebtStatuses = new Set(['PAGO', 'CANCELADA', 'CANCELADO']);

export function normalizeDebtStatus(status: string | null | undefined) {
  if (!status) {
    return 'PENDENTE';
  }

  if (status === 'PENDING') {
    return 'PENDENTE';
  }

  if (status === 'OVERDUE') {
    return 'VENCIDO';
  }

  return status;
}

export function isDebtClosedStatus(status: string | null | undefined) {
  return closedDebtStatuses.has(normalizeDebtStatus(status));
}

export function calculateDebtDaysLate(
  dueDate: Date,
  status: string | null | undefined,
  paidAt?: Date | null,
) {
  if (isDebtClosedStatus(status)) {
    return 0;
  }

  const referenceDate = paidAt ? new Date(paidAt) : new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  referenceDate.setHours(0, 0, 0, 0);

  return Math.max(
    Math.floor((referenceDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );
}

export function isDebtOverdue(debt: {
  dueDate: Date;
  status: string | null | undefined;
  paidAt?: Date | null;
}) {
  return calculateDebtDaysLate(debt.dueDate, debt.status, debt.paidAt) > 0;
}

export function getDebtEffectiveStatus(debt: {
  dueDate: Date;
  status: string | null | undefined;
  paidAt?: Date | null;
}) {
  const status = normalizeDebtStatus(debt.status);

  if (isDebtClosedStatus(status)) {
    return status;
  }

  if (
    (status === 'PENDENTE' || status === 'VENCIDO' || status === 'RENEGOCIADO') &&
    isDebtOverdue({ ...debt, status })
  ) {
    return 'VENCIDO';
  }

  return status;
}

function parseBrazilianMoney(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function lastMoneyMatch(notes: string | null | undefined, pattern: RegExp) {
  let last: string | null = null;
  let match = pattern.exec(notes ?? '');

  while (match) {
    last = match[1] ?? null;
    match = pattern.exec(notes ?? '');
  }

  return last ? parseBrazilianMoney(last) : null;
}

export function getDebtPaymentBreakdown(notes: string | null | undefined): DebtPaymentBreakdown {
  return {
    paidAmount: lastMoneyMatch(notes, /Valor pago[^:\n]*:\s*R\$\s*([\d.,-]+)/gi),
    remainingValue: lastMoneyMatch(notes, /Restante a receber:\s*R\$\s*([\d.,-]+)/gi),
  };
}
