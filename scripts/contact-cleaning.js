function decodeQuotedPrintable(value) {
  const withoutSoftBreaks = decodeRfc2047Words(String(value)).replace(/=\r?\n/g, '');
  const bytes = [];
  let output = '';

  function flushBytes() {
    if (bytes.length > 0) {
      output += Buffer.from(bytes).toString('utf8');
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

function decodeRfc2047Words(value) {
  return String(value).replace(/=\?([^?]+)\?([QB])\?([^?]+)\?=/gi, (_match, _charset, encoding, encoded) => {
    if (String(encoding).toUpperCase() === 'Q') {
      return decodeQuotedPrintable(String(encoded).replace(/_/g, ' '));
    }

    try {
      return Buffer.from(String(encoded), 'base64').toString('utf8');
    } catch {
      return String(encoded);
    }
  });
}

function looksQuotedPrintable(value) {
  return /(?:=[0-9A-Fa-f]{2}){2,}/.test(String(value)) || /=\r?\n/.test(String(value));
}

function decodeContactText(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  const trimmed = value.replace(/^"+|"+$/g, '').trim();
  const decoded = looksQuotedPrintable(trimmed) ? decodeQuotedPrintable(trimmed) : decodeRfc2047Words(trimmed);

  return decoded
    .replace(/\bBEGIN:VCARD\b/gi, ' ')
    .replace(/\bEND:VCARD\b/gi, ' ')
    .replace(/\bVERSION:\d(?:\.\d)?\b/gi, ' ')
    .replace(/\bFN[:;]/gi, ' ')
    .replace(/\bN[:;]/gi, ' ')
    .replace(/\bTEL[:;][^\s]*/gi, ' ')
    .replace(/\bADR[:;][^\s]*/gi, ' ')
    .replace(/\\n/gi, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\s+/g, ' ')
    .trim();
}

function phoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

module.exports = {
  decodeContactText,
  phoneDigits,
};
