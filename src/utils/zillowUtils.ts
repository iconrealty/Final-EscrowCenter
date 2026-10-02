/**
 * Constructs a direct Zillow search/property URL for an address.
 * Zillow automatically redirects this search slug to the specific property details page on desktop.
 */
export function getDirectZillowUrl(address?: string, city?: string, zipCode?: string): string {
  if (!address || !address.trim()) return 'https://www.zillow.com';
  const addr = address.trim();

  const tokens: string[] = [addr];
  if (city && city.trim() && !addr.toLowerCase().includes(city.trim().toLowerCase())) {
    tokens.push(city.trim());
  }
  if (!addr.toLowerCase().includes('ca') && (!city || !city.toLowerCase().includes('ca'))) {
    tokens.push('CA');
  }
  if (zipCode && zipCode.trim() && !addr.includes(zipCode.trim())) {
    tokens.push(zipCode.trim());
  }

  const combined = tokens.join(' ');
  // Clean special characters: remove commas, hash symbols, periods, quotes, trim properly before converting spaces to dashes
  const clean = combined
    .replace(/[#,./'"]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

  return `https://www.zillow.com/homes/${encodeURIComponent(clean)}_rb/`;
}

/**
 * Returns a URL to view the property listing.
 * On mobile devices (iOS / Android), direct zillow.com links are hijacked by
 * the phone's Universal Links / App Links into the native Zillow mobile app.
 * Because the native Zillow app cannot parse address search slugs, it crashes or fails.
 * On mobile, routing to a targeted Google search opens Safari/Chrome directly
 * with the Zillow listing card right at the top, working 100% reliably.
 * On desktop/laptops, it continues to open Zillow directly.
 */
export function getZillowUrl(address?: string, city?: string, zipCode?: string): string {
  if (!address || !address.trim()) return 'https://www.zillow.com';

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  if (isMobile) {
    const tokens: string[] = [address.trim()];
    if (city && city.trim()) tokens.push(city.trim());
    tokens.push('CA');
    if (zipCode && zipCode.trim()) tokens.push(zipCode.trim());
    tokens.push('zillow');
    return `https://www.google.com/search?q=${encodeURIComponent(tokens.join(' '))}`;
  }

  return getDirectZillowUrl(address, city, zipCode);
}
