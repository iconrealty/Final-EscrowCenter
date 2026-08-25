/**
 * Fast in-memory California Zip to City mapping for automatic instant auto-fill.
 * 100% Client-Side, 0 tokens, 0 API keys, 0 external servers.
 */
export const CA_ZIP_TO_CITY: Record<string, string> = {
  // Orange County
  '92602': 'Irvine', '92603': 'Irvine', '92604': 'Irvine', '92606': 'Irvine', '92612': 'Irvine',
  '92614': 'Irvine', '92617': 'Irvine', '92618': 'Irvine', '92620': 'Irvine', '92625': 'Corona del Mar',
  '92626': 'Costa Mesa', '92627': 'Costa Mesa', '92629': 'Dana Point', '92630': 'Lake Forest',
  '92646': 'Huntington Beach', '92647': 'Huntington Beach', '92648': 'Huntington Beach', '92649': 'Huntington Beach',
  '92651': 'Laguna Beach', '92653': 'Laguna Hills', '92656': 'Aliso Viejo', '92657': 'Newport Coast',
  '92660': 'Newport Beach', '92661': 'Newport Beach', '92662': 'Newport Beach', '92663': 'Newport Beach',
  '92672': 'San Clemente', '92673': 'San Clemente', '92675': 'San Juan Capistrano', '92677': 'Laguna Niguel',
  '92679': 'Coto de Caza', '92683': 'Westminster', '92688': 'Rancho Santa Margarita', '92691': 'Mission Viejo',
  '92692': 'Mission Viejo', '92701': 'Santa Ana', '92703': 'Santa Ana', '92704': 'Santa Ana',
  '92705': 'Santa Ana', '92706': 'Santa Ana', '92707': 'Santa Ana', '92708': 'Fountain Valley',
  '92780': 'Tustin', '92782': 'Tustin', '92801': 'Anaheim', '92802': 'Anaheim', '92804': 'Anaheim',
  '92805': 'Anaheim', '92806': 'Anaheim', '92807': 'Anaheim', '92808': 'Anaheim Hills', '92821': 'Brea',
  '92831': 'Fullerton', '92832': 'Fullerton', '92833': 'Fullerton', '92835': 'Fullerton',
  '92866': 'Orange', '92867': 'Orange', '92868': 'Orange', '92869': 'Orange', '92870': 'Placentia',
  '92886': 'Yorba Linda', '92887': 'Yorba Linda',

  // Los Angeles County
  '90001': 'Los Angeles', '90004': 'Los Angeles', '90012': 'Los Angeles', '90015': 'Los Angeles',
  '90017': 'Los Angeles', '90024': 'Los Angeles', '90025': 'Los Angeles', '90027': 'Los Angeles',
  '90028': 'Hollywood', '90036': 'Los Angeles', '90046': 'West Hollywood', '90049': 'Brentwood',
  '90066': 'Los Angeles', '90067': 'Century City', '90068': 'Los Angeles', '90069': 'West Hollywood',
  '90077': 'Bel Air', '90210': 'Beverly Hills', '90211': 'Beverly Hills', '90212': 'Beverly Hills',
  '90230': 'Culver City', '90232': 'Culver City', '90245': 'El Segundo', '90250': 'Hawthorne',
  '90254': 'Hermosa Beach', '90265': 'Malibu', '90266': 'Manhattan Beach', '90272': 'Pacific Palisades',
  '90274': 'Palos Verdes', '90275': 'Rancho Palos Verdes', '90277': 'Redondo Beach', '90278': 'Redondo Beach',
  '90291': 'Venice', '90292': 'Marina del Rey', '90401': 'Santa Monica', '90402': 'Santa Monica',
  '90403': 'Santa Monica', '90405': 'Santa Monica', '90501': 'Torrance', '90503': 'Torrance',
  '90505': 'Torrance', '90802': 'Long Beach', '90803': 'Long Beach', '90807': 'Long Beach',
  '91101': 'Pasadena', '91103': 'Pasadena', '91105': 'Pasadena', '91106': 'Pasadena',
  '91201': 'Glendale', '91202': 'Glendale', '91301': 'Agoura Hills', '91302': 'Calabasas',
  '91316': 'Encino', '91364': 'Woodland Hills', '91367': 'Woodland Hills', '91403': 'Sherman Oaks',
  '91423': 'Sherman Oaks', '91436': 'Encino', '91501': 'Burbank', '91505': 'Burbank',
  '91604': 'Studio City',

  // San Diego County
  '92007': 'Cardiff-by-the-Sea', '92009': 'Carlsbad', '92014': 'Del Mar', '92024': 'Encinitas',
  '92037': 'La Jolla', '92064': 'Poway', '92067': 'Rancho Santa Fe', '92075': 'Solana Beach',
  '92081': 'Vista', '92084': 'Vista', '92101': 'San Diego', '92103': 'San Diego',
  '92104': 'San Diego', '92109': 'Pacific Beach', '92118': 'Coronado', '92121': 'San Diego',
  '92122': 'University City', '92127': 'Rancho Bernardo', '92128': 'Rancho Bernardo', '92130': 'Carmel Valley',

  // Riverside & San Bernardino
  '92501': 'Riverside', '92506': 'Riverside', '92553': 'Moreno Valley', '92562': 'Murrieta',
  '92563': 'Murrieta', '92591': 'Temecula', '92592': 'Temecula', '92880': 'Corona',
  '92881': 'Corona', '92882': 'Corona', '92401': 'San Bernardino', '92404': 'San Bernardino',
  '91701': 'Rancho Cucamonga', '91709': 'Chino Hills', '91710': 'Chino', '91730': 'Rancho Cucamonga',
  '91739': 'Rancho Cucamonga', '91761': 'Ontario', '91764': 'Ontario', '91784': 'Upland',
  '91786': 'Upland', '92373': 'Redlands', '92374': 'Redlands',

  // Bay Area / Northern CA
  '94102': 'San Francisco', '94103': 'San Francisco', '94107': 'San Francisco', '94109': 'San Francisco',
  '94110': 'San Francisco', '94114': 'San Francisco', '94115': 'San Francisco', '94118': 'San Francisco',
  '94123': 'San Francisco', '94301': 'Palo Alto', '94306': 'Palo Alto', '94025': 'Menlo Park',
  '94022': 'Los Altos', '94040': 'Mountain View', '94086': 'Sunnyvale', '94087': 'Sunnyvale',
  '95014': 'Cupertino', '95070': 'Saratoga', '95120': 'San Jose', '95125': 'San Jose',
  '95129': 'San Jose', '94611': 'Oakland', '94705': 'Berkeley', '94536': 'Fremont',
  '94539': 'Fremont', '94568': 'Dublin', '94588': 'Pleasanton', '94583': 'San Ramon',
  '94596': 'Walnut Creek', '95814': 'Sacramento', '95816': 'Sacramento', '95819': 'Sacramento'
};

/**
 * Returns city from zip code if known
 */
export function getCityFromZip(zip: string): string | null {
  if (!zip) return null;
  const cleanZip = zip.trim().substring(0, 5);
  return CA_ZIP_TO_CITY[cleanZip] || null;
}
