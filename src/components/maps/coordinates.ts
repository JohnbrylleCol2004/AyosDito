export function parseCoordinates(latitude: string, longitude: string) {
  const lat = latitude.trim(),
    lng = longitude.trim();
  if (!lat && !lng) return { latitude: null, longitude: null };
  const number = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!number.test(lat) || !number.test(lng)) return null;
  const a = Number(lat),
    b = Number(lng);
  return Number.isFinite(a) &&
    Number.isFinite(b) &&
    a >= -90 &&
    a <= 90 &&
    b >= -180 &&
    b <= 180
    ? { latitude: a, longitude: b }
    : null;
}
