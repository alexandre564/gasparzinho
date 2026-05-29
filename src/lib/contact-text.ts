export function decodeContactText(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const trimmed = String(value).replace(/^"+|"+$/g, '').trim();
  const decoded = looksQuotedPrintable(trimmed)
    ? decodeQuotedPrintable(trimmed)
    : decodeRfc2047Words(trimmed);

  return stripVcardNoise(decoded)
    .replace(/\\n/gi, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSearchText(value: string | null | undefined) {
  return decodeContactText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function onlyDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

export function normalizeImportedPhone(value: string | null | undefined) {
  return decodeContactText(value).replace(/^"+|"+$/g, '').replace(/\s+/g, ' ').trim();
}

export function cleanCustomerTextFields<T extends object>(customer: T): T {
  const textFields = [
    'name',
    'phone',
    'cep',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'reference',
  ];

  return textFields.reduce((accumulator, field) => {
    const value = accumulator[field];

    if (typeof value === 'string') {
      return { ...accumulator, [field]: decodeContactText(value) };
    }

    return accumulator;
  }, { ...customer } as Record<string, unknown>) as T;
}

function decodeQuotedPrintable(value: string) {
  const withoutSoftBreaks = decodeRfc2047Words(value).replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  let output = '';

  function flushBytes() {
    if (bytes.length > 0) {
      output += new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
      bytes.length = 0;
    }
  }

  for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
    const char = withoutSoftBreaks[index];
    const hex = withoutSoftBreaks.slice(index + 1, index + 3);

    if (char === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }

    flushBytes();
    output += char;
  }

  flushBytes();
  return output;
}

function decodeRfc2047Words(value: string) {
  return value.replace(/=\?([^?]+)\?([QB])\?([^?]+)\?=/gi, (_match, _charset: string, encoding: string, encoded: string) => {
    if (String(encoding).toUpperCase() === 'Q') {
      return decodeQuotedPrintable(String(encoded).replace(/_/g, ' '));
    }

    try {
      const binary = globalThis.atob(String(encoded));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      return String(encoded);
    }
  });
}

function looksQuotedPrintable(value: string) {
  return /(?:=[0-9A-Fa-f]{2}){2,}/.test(value) || /=\r?\n/.test(value);
}

function stripVcardNoise(value: string) {
  return value
    .replace(/\bBEGIN:VCARD\b/gi, ' ')
    .replace(/\bEND:VCARD\b/gi, ' ')
    .replace(/\bVERSION:\d(?:\.\d)?\b/gi, ' ')
    .replace(/\bFN[:;]/gi, ' ')
    .replace(/\bN[:;]/gi, ' ')
    .replace(/\bTEL[:;][^\s]*/gi, ' ')
    .replace(/\bADR[:;][^\s]*/gi, ' ');
}
