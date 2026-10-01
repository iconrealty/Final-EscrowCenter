/**
 * Constructs a safe Zillow URL that routes through /api/open-zillow.
 * This prevents iOS Universal Links & Android App Links from hijacking the click
 * into the native Zillow app (which crashes/fails on search query slugs).
 * The mobile and desktop browser will cleanly load the property on Zillow web.
 */
export function getZillowUrl(address?: string, city?: string, zipCode?: string): string {
  if (!address || !address.trim()) return 'https://www.zillow.com';
  const params = new URLSearchParams();
  params.set('address', address.trim());
  if (city && city.trim()) params.set('city', city.trim());
  if (zipCode && zipCode.trim()) params.set('zipCode', zipCode.trim());
  return `/api/open-zillow?${params.toString()}`;
}
