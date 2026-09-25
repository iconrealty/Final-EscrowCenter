import { CA_ZIP_TO_CITY, getCityFromZip } from './californiaZipDb';
import { parseAddressComponents } from '../types';

export interface UtilityItem {
  utility: string;
  company: string;
  phone: string;
  website: string;
}

// City-specific utility databases for major California regions
const CITY_UTILITIES_DATABASE: Record<string, UtilityItem[]> = {
  // Orange County - Irvine
  'irvine': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Irvine Ranch Water District (IRWD)',
      phone: '(949) 453-5300',
      website: 'https://www.irwd.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Waste Management',
      phone: '(800) 423-9986',
      website: 'https://www.wm.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],

  // Newport Beach / Corona del Mar / Newport Coast
  'newport beach': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of Newport Beach Utilities',
      phone: '(949) 644-3011',
      website: 'https://www.newportbeachca.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'corona del mar': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of Newport Beach Utilities',
      phone: '(949) 644-3011',
      website: 'https://www.newportbeachca.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'newport coast': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Irvine Ranch Water District (IRWD)',
      phone: '(949) 453-5300',
      website: 'https://www.irwd.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications / Spectrum',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],

  // Costa Mesa
  'costa mesa': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Mesa Water District',
      phone: '(949) 631-1200',
      website: 'https://www.mesawater.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],

  // Huntington Beach
  'huntington beach': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of Huntington Beach Utilities',
      phone: '(714) 536-5919',
      website: 'https://www.huntingtonbeachca.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Republic Services',
      phone: '(714) 847-3581',
      website: 'https://www.republicservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Frontier Fiber / Spectrum',
      phone: '(800) 921-8101',
      website: 'https://www.frontier.com'
    }
  ],

  // Anaheim
  'anaheim': [
    {
      utility: 'Electric',
      company: 'Anaheim Public Utilities (Electric)',
      phone: '(714) 765-3300',
      website: 'https://www.anaheim.net/utilities'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Anaheim Public Utilities (Water)',
      phone: '(714) 765-3300',
      website: 'https://www.anaheim.net/utilities'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Republic Services of Anaheim',
      phone: '(714) 238-2444',
      website: 'https://www.republicservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],

  // South Orange County (Laguna Niguel, Laguna Hills, Aliso Viejo, Mission Viejo, etc.)
  'laguna beach': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Laguna Beach County Water District',
      phone: '(949) 494-1041',
      website: 'https://www.lbcwd.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Waste Management',
      phone: '(800) 423-9986',
      website: 'https://www.wm.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'laguna niguel': [
    {
      utility: 'Electric',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Moulton Niguel Water District',
      phone: '(949) 831-2500',
      website: 'https://www.mnwd.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'aliso viejo': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Moulton Niguel Water District',
      phone: '(949) 831-2500',
      website: 'https://www.mnwd.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'mission viejo': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE) / SDG&E',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Santa Margarita Water District (SMWD)',
      phone: '(949) 459-6420',
      website: 'https://www.smwd.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Waste Management',
      phone: '(800) 423-9986',
      website: 'https://www.wm.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'lake forest': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'El Toro Water District',
      phone: '(949) 837-0660',
      website: 'https://www.etwd.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'san clemente': [
    {
      utility: 'Electric',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Gas',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of San Clemente Water & Sewer',
      phone: '(949) 361-8315',
      website: 'https://www.san-clemente.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'dana point': [
    {
      utility: 'Electric',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Gas',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'South Coast Water District',
      phone: '(949) 499-4555',
      website: 'https://www.scwd.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],

  // Los Angeles (City & Neighborhoods)
  'los angeles': [
    {
      utility: 'Electric',
      company: 'Los Angeles Dept of Water & Power (LADWP)',
      phone: '(800) 342-5397',
      website: 'https://www.ladwp.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Los Angeles Dept of Water & Power (LADWP)',
      phone: '(800) 342-5397',
      website: 'https://www.ladwp.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'LA Sanitation (LASAN)',
      phone: '(800) 773-2489',
      website: 'https://www.lacitysan.org'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'santa monica': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE) / Clean Power Alliance',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of Santa Monica Water Resources',
      phone: '(310) 458-8224',
      website: 'https://www.santamonica.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Santa Monica Resource Recovery',
      phone: '(310) 458-8526',
      website: 'https://www.santamonica.gov'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / Frontier Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'beverly hills': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of Beverly Hills Public Works',
      phone: '(310) 285-2467',
      website: 'https://www.beverlyhills.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Beverly Hills Public Works',
      phone: '(310) 285-2467',
      website: 'https://www.beverlyhills.org'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'pasadena': [
    {
      utility: 'Electric',
      company: 'Pasadena Water and Power (PWP)',
      phone: '(626) 744-4005',
      website: 'https://www.pwpweb.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Pasadena Water and Power (PWP)',
      phone: '(626) 744-4005',
      website: 'https://www.pwpweb.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Pasadena Public Works',
      phone: '(626) 744-7311',
      website: 'https://www.cityofpasadena.net'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'glendale': [
    {
      utility: 'Electric',
      company: 'Glendale Water & Power (GWP)',
      phone: '(818) 548-3300',
      website: 'https://www.glendaleca.gov'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Glendale Water & Power (GWP)',
      phone: '(818) 548-3300',
      website: 'https://www.glendaleca.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Glendale Public Works',
      phone: '(818) 548-3916',
      website: 'https://www.glendaleca.gov'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'burbank': [
    {
      utility: 'Electric',
      company: 'Burbank Water and Power (BWP)',
      phone: '(818) 238-3700',
      website: 'https://www.burbankwaterandpower.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Burbank Water and Power (BWP)',
      phone: '(818) 238-3700',
      website: 'https://www.burbankwaterandpower.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Burbank Public Works',
      phone: '(818) 238-3800',
      website: 'https://www.burbankca.gov'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'long beach': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'Long Beach Utilities (Gas Dept)',
      phone: '(562) 570-5700',
      website: 'https://www.longbeachutilities.org'
    },
    {
      utility: 'Water & Sewer',
      company: 'Long Beach Utilities (Water Dept)',
      phone: '(562) 570-5700',
      website: 'https://www.longbeachutilities.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Long Beach Environmental Services',
      phone: '(562) 570-2876',
      website: 'https://www.longbeach.gov'
    },
    {
      utility: 'Internet & Cable',
      company: 'Frontier Fiber / Spectrum',
      phone: '(800) 921-8101',
      website: 'https://www.frontier.com'
    }
  ],

  // San Diego County
  'san diego': [
    {
      utility: 'Electric',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Gas',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of San Diego Public Utilities',
      phone: '(619) 515-3500',
      website: 'https://www.sandiego.gov/public-utilities'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of San Diego Environmental Services',
      phone: '(858) 694-7000',
      website: 'https://www.sandiego.gov/environmental-services'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications / Spectrum',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],
  'carlsbad': [
    {
      utility: 'Electric',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Gas',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Carlsbad Municipal Water District',
      phone: '(760) 438-2722',
      website: 'https://www.carlsbadca.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Waste Management of North County',
      phone: '(800) 423-9986',
      website: 'https://www.wm.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'encinitas': [
    {
      utility: 'Electric',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Gas',
      company: 'San Diego Gas & Electric (SDG&E)',
      phone: '(800) 411-7343',
      website: 'https://www.sdge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'San Dieguito Water District / Olivenhain MWD',
      phone: '(760) 633-2650',
      website: 'https://www.sdwd.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'EDCO Waste & Recycling Services',
      phone: '(760) 436-4177',
      website: 'https://www.edcodisposal.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Cox Communications / Spectrum',
      phone: '(800) 234-3993',
      website: 'https://www.cox.com'
    }
  ],

  // Riverside & San Bernardino (Inland Empire)
  'riverside': [
    {
      utility: 'Electric',
      company: 'Riverside Public Utilities (RPU)',
      phone: '(951) 782-0330',
      website: 'https://www.riversideca.gov/utilities'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Riverside Public Utilities (Water)',
      phone: '(951) 782-0330',
      website: 'https://www.riversideca.gov/utilities'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of Riverside Solid Waste',
      phone: '(951) 826-5311',
      website: 'https://www.riversideca.gov'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / AT&T Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'corona': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE) / Corona DWP',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'City of Corona Dept of Water & Power',
      phone: '(951) 736-2234',
      website: 'https://www.coronaca.gov'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Waste Management',
      phone: '(800) 423-9986',
      website: 'https://www.wm.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / Frontier Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'temecula': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Rancho California Water District',
      phone: '(951) 296-6900',
      website: 'https://www.ranchowater.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'CR&R Environmental Services',
      phone: '(800) 826-9677',
      website: 'https://www.crrwasteservices.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / Frontier Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],
  'rancho cucamonga': [
    {
      utility: 'Electric',
      company: 'Southern California Edison (SCE)',
      phone: '(800) 655-4555',
      website: 'https://www.sce.com'
    },
    {
      utility: 'Gas',
      company: 'SoCalGas',
      phone: '(800) 427-2200',
      website: 'https://www.socalgas.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'Cucamonga Valley Water District',
      phone: '(909) 987-2591',
      website: 'https://www.cvwdwater.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Burrtec Waste Industries',
      phone: '(909) 987-3717',
      website: 'https://www.burrtec.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Spectrum / Frontier Fiber',
      phone: '(855) 243-8892',
      website: 'https://www.spectrum.com'
    }
  ],

  // Bay Area / Northern CA
  'san francisco': [
    {
      utility: 'Electric',
      company: 'Pacific Gas and Electric (PG&E)',
      phone: '(800) 743-5000',
      website: 'https://www.pge.com'
    },
    {
      utility: 'Gas',
      company: 'Pacific Gas and Electric (PG&E)',
      phone: '(800) 743-5000',
      website: 'https://www.pge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'San Francisco Public Utilities Commission (SFPUC)',
      phone: '(415) 551-3000',
      website: 'https://www.sfpuc.org'
    },
    {
      utility: 'Trash & Recycling',
      company: 'Recology San Francisco',
      phone: '(415) 330-1300',
      website: 'https://www.recology.com'
    },
    {
      utility: 'Internet & Cable',
      company: 'Xfinity (Comcast) / Sonic / AT&T Fiber',
      phone: '(800) 934-6489',
      website: 'https://www.xfinity.com'
    }
  ],
  'san jose': [
    {
      utility: 'Electric',
      company: 'Pacific Gas and Electric (PG&E) / San Jose Clean Energy',
      phone: '(800) 743-5000',
      website: 'https://www.pge.com'
    },
    {
      utility: 'Gas',
      company: 'Pacific Gas and Electric (PG&E)',
      phone: '(800) 743-5000',
      website: 'https://www.pge.com'
    },
    {
      utility: 'Water & Sewer',
      company: 'San Jose Water Company',
      phone: '(408) 279-7900',
      website: 'https://www.sjwater.com'
    },
    {
      utility: 'Trash & Recycling',
      company: 'City of San Jose Environmental Services',
      phone: '(408) 535-3500',
      website: 'https://www.sanjoseca.gov'
    },
    {
      utility: 'Internet & Cable',
      company: 'Xfinity (Comcast) / AT&T Fiber',
      phone: '(800) 934-6489',
      website: 'https://www.xfinity.com'
    }
  ]
};

// General Default Fallback for California properties
const DEFAULT_CALIFORNIA_UTILITIES: UtilityItem[] = [
  {
    utility: 'Electric',
    company: 'Southern California Edison (SCE)',
    phone: '(800) 655-4555',
    website: 'https://www.sce.com'
  },
  {
    utility: 'Gas',
    company: 'SoCalGas',
    phone: '(800) 427-2200',
    website: 'https://www.socalgas.com'
  },
  {
    utility: 'Water & Sewer',
    company: 'Local Municipal Water District',
    phone: '(800) 427-2200',
    website: 'https://www.waterboards.ca.gov'
  },
  {
    utility: 'Trash & Recycling',
    company: 'Waste Management / Republic Services',
    phone: '(800) 423-9986',
    website: 'https://www.wm.com'
  },
  {
    utility: 'Internet & Cable',
    company: 'Spectrum / Cox / AT&T Fiber',
    phone: '(855) 243-8892',
    website: 'https://www.spectrum.com'
  }
];

/**
 * Resolves the city name from escrow address fields or zip code
 */
export function resolveCityForEscrow(escrow?: { address?: string; city?: string; zipCode?: string } | null): string {
  if (!escrow) return '';
  if (escrow.city && escrow.city.trim()) {
    return escrow.city.trim();
  }
  if (escrow.zipCode) {
    const zipCity = getCityFromZip(escrow.zipCode);
    if (zipCity) return zipCity;
  }
  if (escrow.address) {
    const parsed = parseAddressComponents(escrow.address);
    if (parsed.city) return parsed.city;
    if (parsed.zipCode) {
      const zipCity = getCityFromZip(parsed.zipCode);
      if (zipCity) return zipCity;
    }
    // Check if city name is mentioned in address string
    const lower = escrow.address.toLowerCase();
    for (const cityKey of Object.keys(CITY_UTILITIES_DATABASE)) {
      if (lower.includes(cityKey)) {
        return cityKey;
      }
    }
  }
  return '';
}

/**
 * Returns all utility providers for an escrow property address.
 * If specific utilities are customized on the escrow, those are used.
 * Otherwise, the city/zip is resolved and matching California providers are returned.
 */
export function getUtilitiesForAddress(
  escrow?: { address?: string; city?: string; zipCode?: string; utilities?: UtilityItem[] } | null
): UtilityItem[] {
  if (escrow?.utilities && Array.isArray(escrow.utilities) && escrow.utilities.length > 0) {
    return escrow.utilities;
  }

  const city = resolveCityForEscrow(escrow).toLowerCase();
  if (city && CITY_UTILITIES_DATABASE[city]) {
    return CITY_UTILITIES_DATABASE[city];
  }

  // Check partial match for city (e.g. "Rancho Cucamonga", "Anaheim Hills", "West Hollywood")
  if (city) {
    for (const [key, list] of Object.entries(CITY_UTILITIES_DATABASE)) {
      if (city.includes(key) || key.includes(city)) {
        return list;
      }
    }
  }

  // Check zip prefix for San Diego (920xx, 921xx)
  const zip = (escrow?.zipCode || (escrow?.address ? parseAddressComponents(escrow.address).zipCode : '')).trim();
  if (zip.startsWith('920') || zip.startsWith('921')) {
    return CITY_UTILITIES_DATABASE['san diego'];
  }
  // Check Bay Area zip prefix (94xxx, 95xxx)
  if (zip.startsWith('94') || zip.startsWith('95')) {
    return CITY_UTILITIES_DATABASE['san francisco'];
  }
  // Check Los Angeles zip prefix (900xx, 902xx, 913xx, 914xx, 916xx)
  if (zip.startsWith('900') || zip.startsWith('913') || zip.startsWith('914') || zip.startsWith('916')) {
    return CITY_UTILITIES_DATABASE['los angeles'];
  }

  return DEFAULT_CALIFORNIA_UTILITIES;
}

/**
 * Formats utility list into the exact user-specified structure:
 *
 * [Utility Name]
 * [Company Name]
 * [Phone Number]
 * [Website URL]
 */
export function formatUtilitiesForAddress(
  escrow?: { address?: string; city?: string; zipCode?: string; utilities?: UtilityItem[] } | null
): string {
  const utilities = getUtilitiesForAddress(escrow);
  return utilities
    .map(item => {
      const lines = [item.utility, item.company, item.phone, item.website].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');
}
