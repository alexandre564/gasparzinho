// TODO: [Dívida Técnica] Os valores abaixo formam uma camada temporária
// de compatibilidade. Eles preservam contratos antigos do projeto enquanto
// a modelagem real ainda usa strings soltas no banco e em partes do frontend.
// Não adicione novos valores aqui sem revisar todos os consumidores.

export const OrderStatus = {
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  PROCESSANDO: 'PROCESSANDO',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  ENVIADO: 'ENVIADO',
  ENTREGUE: 'ENTREGUE',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const DebtStatus = {
  PENDENTE: 'PENDENTE',
  VENCIDO: 'VENCIDO',
  PAGO: 'PAGO',
  RENEGOCIADO: 'RENEGOCIADO',
  PENDING: 'PENDING',
  OVERDUE: 'OVERDUE',
} as const;

export type DebtStatus = (typeof DebtStatus)[keyof typeof DebtStatus];

export const DeliveryStatus = {
  PENDENTE: 'PENDENTE',
  EM_ROTA: 'EM_ROTA',
  ENTREGUE: 'ENTREGUE',
  CANCELADA: 'CANCELADA',
} as const;

export type DeliveryStatus =
  (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const StockKind = {
  UNIDADE: 'UNIDADE',
  CHEIO_VAZIO: 'CHEIO_VAZIO',
} as const;

export type StockKind = (typeof StockKind)[keyof typeof StockKind];

export const ProductCategory = {
  BOTIJAO: 'BOTIJAO',
  AGUA: 'AGUA',
  ACESSORIO: 'ACESSORIO',
  OUTROS: 'OUTROS',
} as const;

export type ProductCategory =
  (typeof ProductCategory)[keyof typeof ProductCategory];
