export type DebtPaymentBreakdown = {
  paidAmount: number | null;
  remainingValue: number | null;
};

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
