export function sortedPhotos(photos: Record<string, string>, fallback: string): string[] {
  const images = Object.entries(photos)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, url]) => url);
  return images.length > 0 ? images : [fallback];
}
