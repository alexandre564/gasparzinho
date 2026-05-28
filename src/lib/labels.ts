export const orderStatusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  PROCESSANDO: 'Processando',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const deliveryStatusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ROTA: 'Em rota',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

export const debtStatusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  VENCIDO: 'Vencido',
  PAGO: 'Pago',
  RENEGOCIADO: 'Renegociado',
  CANCELADA: 'Cancelada',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
};

export const paymentMethodLabels: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO: 'Cartão',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  FIADO: 'Fiado',
};

export const vehicleStatusLabels: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  MANUTENCAO: 'Manutenção',
};

export const vehicleTypeLabels: Record<string, string> = {
  MOTO: 'Moto',
  CARRO: 'Carro',
  VAN: 'Van',
  CAMINHAO: 'Caminhão',
};

export function labelFrom(map: Record<string, string>, value: string | null | undefined, fallback = '-') {
  if (!value) {
    return fallback;
  }

  return map[value] ?? value;
}
