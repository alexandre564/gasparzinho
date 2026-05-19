export type DeliveryStatus = 'PENDENTE' | 'AGUARDANDO_ENVIO' | 'ENVIADO_AO_ENTREGADOR' | 'EM_TRANSITO' | 'EM_ROTA' | 'ENTREGUE' | 'FALHA_NA_ENTREGA' | 'CANCELADO';
export const DeliveryStatus = { PENDENTE: 'PENDENTE' as DeliveryStatus, AGUARDANDO_ENVIO: 'AGUARDANDO_ENVIO' as DeliveryStatus, ENVIADO_AO_ENTREGADOR: 'ENVIADO_AO_ENTREGADOR' as DeliveryStatus, EM_TRANSITO: 'EM_TRANSITO' as DeliveryStatus, EM_ROTA: 'EM_ROTA' as DeliveryStatus, ENTREGUE: 'ENTREGUE' as DeliveryStatus, FALHA_NA_ENTREGA: 'FALHA_NA_ENTREGA' as DeliveryStatus, CANCELADO: 'CANCELADO' as DeliveryStatus };
export type OrderStatus = 'PENDENTE' | 'CONFIRMADO' | 'EM_PRODUCAO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO' | 'CONCLUIDO';
export const OrderStatus = { PENDENTE: 'PENDENTE' as OrderStatus, CONFIRMADO: 'CONFIRMADO' as OrderStatus, EM_PRODUCAO: 'EM_PRODUCAO' as OrderStatus, PRONTO: 'PRONTO' as OrderStatus, ENTREGUE: 'ENTREGUE' as OrderStatus, CANCELADO: 'CANCELADO' as OrderStatus, CONCLUIDO: 'CONCLUIDO' as OrderStatus };

export const StockKind = { ENTRADA: 'ENTRADA', SAIDA: 'SAIDA', AJUSTE: 'AJUSTE' } as const;
export type StockKind = typeof StockKind[keyof typeof StockKind];
export const ProductCategory = { GAS: 'GAS', AGUA: 'AGUA', REFIL: 'REFIL', OUTROS: 'OUTROS' } as const;
export type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory];
