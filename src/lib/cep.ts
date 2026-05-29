export type CepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function normalizeCep(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

export async function fetchAddressByCep(value: string): Promise<CepAddress> {
  const cep = normalizeCep(value);

  if (cep.length !== 8) {
    throw new Error('Informe um CEP com 8 dígitos.');
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

  if (!response.ok) {
    throw new Error('Falha ao buscar CEP.');
  }

  const data = await response.json();

  if (data.erro) {
    throw new Error('CEP não encontrado.');
  }

  return {
    cep,
    street: data.logradouro ?? '',
    neighborhood: data.bairro ?? '',
    city: data.localidade ?? '',
    state: data.uf ?? '',
  };
}
