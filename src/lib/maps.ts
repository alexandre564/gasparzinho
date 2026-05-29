function normalizeLocationQuery(address: string) {
  return address.replace(/\s+/g, ' ').trim();
}

export function buildGoogleMapsUrl(address: string) {
  const query = normalizeLocationQuery(address);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : '#';
}

export function buildWazeUrl(address: string) {
  const query = normalizeLocationQuery(address);
  return query
    ? `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`
    : '#';
}
