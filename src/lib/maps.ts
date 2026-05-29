function normalizeLocationQuery(address: string) {
  const query = address
    .replace(/\bCEP\s*\d{5}-?\d{3}\b/gi, '')
    .replace(/\bcep\s*:/gi, '')
    .replace(/\bendere[cç]o\s*:/gi, '')
    .replace(/\brefer[eê]ncia\s*:.*/gi, '')
    .replace(/\bn[uú]mero\b/gi, '')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  if (!query) {
    return '';
  }

  const hasBrazilState = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO|Minas Gerais)\b/i.test(query);
  const withState = hasBrazilState
    ? query
    : `${query}, Minas Gerais`;

  return /\bBrasil\b/i.test(withState) ? withState : `${withState}, Brasil`;
}

export function buildGoogleMapsUrl(address: string) {
  const query = normalizeLocationQuery(address);
  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`
    : '#';
}

export function buildWazeUrl(address: string) {
  const query = normalizeLocationQuery(address);
  return query
    ? `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`
    : '#';
}
