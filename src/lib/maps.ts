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

  const hasCityHint = /\bLavras\b/i.test(query);
  const hasBrazilState = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO|Minas Gerais)\b/i.test(query);
  const withCity = hasCityHint || hasBrazilState ? query : `${query}, Lavras`;
  const withState = hasBrazilState
    ? withCity
    : `${withCity}, Minas Gerais`;

  return /\bBrasil\b/i.test(withState) ? withState : `${withState}, Brasil`;
}

function encodeRouteQuery(address: string) {
  return encodeURIComponent(normalizeLocationQuery(address));
}

export function buildGoogleMapsUrl(address: string) {
  const query = encodeRouteQuery(address);
  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`
    : '#';
}

export function buildWazeUrl(address: string) {
  const query = encodeRouteQuery(address);
  return query
    ? `https://waze.com/ul?q=${query}&navigate=yes`
    : '#';
}

export function buildGoogleMapsRouteUrl(addresses: string[]) {
  const routeAddresses = addresses
    .map(normalizeLocationQuery)
    .filter(Boolean)
    .filter((address, index, current) => current.indexOf(address) === index)
    .slice(0, 10);

  if (routeAddresses.length === 0) {
    return '#';
  }

  if (routeAddresses.length === 1) {
    return buildGoogleMapsUrl(routeAddresses[0]);
  }

  const destination = routeAddresses[routeAddresses.length - 1];
  const waypoints = routeAddresses.slice(0, -1);

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints.join('|'))}&travelmode=driving`;
}

export function buildWazeMultiStopFallbackUrl(addresses: string[]) {
  const firstAddress = addresses.map(normalizeLocationQuery).find(Boolean);

  return firstAddress
    ? buildWazeUrl(firstAddress)
    : '#';
}
