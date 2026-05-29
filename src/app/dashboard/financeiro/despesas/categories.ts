export const EXPENSE_CATEGORIES = [
  'Frota/Veiculos',
  'Marketing',
  'Estoque',
  'Escritorio',
  'Despesas Fixas',
  'Outros',
] as const;

export const EXPENSE_SUBCATEGORIES: Record<(typeof EXPENSE_CATEGORIES)[number], string[]> = {
  'Frota/Veiculos': ['Combustivel', 'Manutencao', 'Consertos', 'Documentacao', 'Outros'],
  Marketing: ['Campanhas', 'Materiais', 'Publicidade', 'Promocoes', 'Outros'],
  Estoque: ['Compra de produtos', 'Reposicao de botijoes', 'Insumos', 'Outros'],
  Escritorio: ['Material de escritorio', 'Equipamentos', 'Sistema', 'Outros'],
  'Despesas Fixas': ['Agua', 'Luz', 'Telefone', 'Internet', 'Aluguel', 'Outros'],
  Outros: ['Outros'],
};

export const EXPENSE_PAYMENT_METHODS = [
  'Dinheiro',
  'Pix',
  'Cartao de credito',
  'Cartao de debito',
  'Boleto',
  'Transferencia',
  'Outros',
] as const;

const EXPENSE_LABELS: Record<string, string> = {
  'Frota/Veiculos': 'Frota/Veículos',
  Escritorio: 'Escritório',
  Combustivel: 'Combustível',
  Manutencao: 'Manutenção',
  Documentacao: 'Documentação',
  Promocoes: 'Promoções',
  Reposicao: 'Reposição',
  'Reposicao de botijoes': 'Reposição de botijões',
  'Material de escritorio': 'Material de escritório',
  Agua: 'Água',
  'Cartao de credito': 'Cartão de crédito',
  'Cartao de debito': 'Cartão de débito',
  Transferencia: 'Transferência',
};

export function expenseLabel(value?: string | null) {
  if (!value) {
    return '-';
  }

  return EXPENSE_LABELS[value] ?? value;
}
