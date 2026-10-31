// No three here: the overlay (Vue island) imports it and must not pull the 3D engine into its chunk.

/** Longitude wrapped to (-180, 180]. */
export function wrapLongitude(lon: number): number {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/** "48.8°N 2.3°E": one decimal, hemisphere letters. */
export function formatCoordinates(lat: number, lon: number): string {
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLon = Math.round(wrapLongitude(lon) * 10) / 10;
  const ns = roundedLat < 0 ? 'S' : 'N';
  const ew = roundedLon < 0 ? 'W' : 'E';
  return `${Math.abs(roundedLat).toFixed(1)}°${ns} ${Math.abs(roundedLon).toFixed(1)}°${ew}`;
}
