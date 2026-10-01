/**
 * Constructs a direct Zillow search/property URL for an address.
 * Zillow automatically redirects this search slug to the specific property details page.
 */
export function getZillowUrl(address?: string, city?: string, zipCode?: string): string {
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
