import { Listing } from '../types';
import { parseISO, format } from 'date-fns';

export const COGNITO_NEW_LISTING_FORM_URL = 'https://www.cognitoforms.com/IconRealtyPartners/NewListingIntakeForm';

function formatDateForCognito(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isNaN(date.getTime())) {
      return format(date, 'yyyy-MM-dd');
    }
  } catch (e) {
    // fallback
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return dateStr;
}

function mapPropertyType(propType?: string): string {
  if (!propType) return 'Single Family Home';
  const p = propType.trim().toLowerCase();
  if (p.includes('condo')) return 'Condo';
  if (p.includes('town')) return 'Townhome';
  if (p.includes('mobile')) return 'Mobile Home';
  if (p.includes('land') || p.includes('lot')) return 'Vacant Land';
  if (p.includes('duplex')) return 'Duplex';
  if (p.includes('triplex')) return 'Triplex';
  if (p.includes('quad')) return 'Quadplex';
  return 'Single Family Home';
}

function mapLeadSource(source?: string): string {
  if (!source) return '';
  const s = source.trim().toLowerCase();
  if (s.includes('opcity')) return 'Opcity';
  if (s.includes('zillow flex')) return 'Zillow Flex';
  if (s.includes('zillow seller')) return 'Zillow Seller Lead';
  if (s.includes('zillow nurture') || s.includes('nurture')) return 'Zillow - Nurture';
  if (s.includes('zillow')) return 'Zillow - No Referral';
  if (s.includes('self') || s.includes('sphere')) return 'Self Generated';
  if (s.includes('realtor')) return 'Realtor.com';
  if (s.includes('redfin')) return 'Redfin';
  if (s.includes('facebook')) return 'Facebook';
  if (s.includes('google')) return 'Google';
  if (s.includes('past client')) return 'Past Client';
  if (s.includes('sign call')) return 'Sign Call';
  if (s.includes('door')) return 'Door Knocking';
  if (s.includes('addressable')) return 'Addressable';
  if (s.includes('ylopo')) return 'YLOPO';
  if (s.includes('homelight')) return 'HomeLight';
  if (s.includes('fsbo')) return 'FSBO';
  if (s.includes('colton')) return 'Referral From Colton';
  if (s.includes('referral')) return 'Referral From Agent- if so, include referral agreement paperwork';
  return source.trim();
}

/**
 * Builds a URL that opens the Cognito Form with listing data pre-filled.
 * Matches exact canonical Cognito Forms internal fields:
 * - Bedrooms (text)
 * - Bathrooms (text)
 * - SqFootage (text)
 * - PropertyType (dropdown)
 * - ClientLegalName (Name: { First, Last })
 * - ClientsEmail (email)
 * - ClientPhone (phone)
 * - ClientInCRM ("Yes")
 * - Client2Name (Name: { First, Last })
 * - Client2Email (email)
 * - Client2Phone (phone)
 * - ClientInCRM2 ("Yes")
 * - SourceOfListingLead2 (dropdown)
 * - ListingPrice (number)
 * - GoLiveDate (date YYYY-MM-DD)
 * - CommissionSplitlistingAgent (percent decimal)
 * - PropertyAddress (Address: { Line1, City, State: "CA", PostalCode })
 * - YourName (Name: { First, Last })
 * - YourEmail (email)
 */
export function buildCognitoFormPrefillUrl(
  listing: Listing,
  user?: { displayName?: string | null; email?: string | null; phoneNumber?: string | null } | null
): string {
  try {
    const agentName = (listing.agentName || user?.displayName || 'Paul Muner').trim();
    const agentEmail = (listing.agentEmail || user?.email || 'paulmuner@gmail.com').trim();
    
    const nameParts = agentName.split(' ');
    const agentFirstName = nameParts[0] || '';
    const agentLastName = nameParts.slice(1).join(' ') || '';

    const client1First = (listing.clientFirstName || '').trim();
    const client1Last = (listing.clientLastName || '').trim();
    const client2First = (listing.client2FirstName || '').trim();
    const client2Last = (listing.client2LastName || '').trim();

    const goLive = formatDateForCognito(listing.goLiveDate || listing.forSaleDate);

    const entryData: Record<string, any> = {};

    // Agent Name & Email
    if (agentFirstName || agentLastName) {
      entryData['YourName'] = { 'First': agentFirstName, 'Last': agentLastName };
    }
    if (agentEmail) {
      entryData['YourEmail'] = agentEmail;
    }

    // Property Address
    const addressObj: Record<string, string> = {};
    if (listing.address && listing.address.trim()) addressObj['Line1'] = listing.address.trim();
    if (listing.city && listing.city.trim()) addressObj['City'] = listing.city.trim();
    addressObj['State'] = 'CA';
    if (listing.zipCode && listing.zipCode.trim()) addressObj['PostalCode'] = listing.zipCode.trim();
    if (Object.keys(addressObj).length > 0) {
      entryData['PropertyAddress'] = addressObj;
    }

    // Bedrooms (Cognito field name: 'Bedrooms', type: string)
    if (listing.bedrooms !== undefined && listing.bedrooms !== null && String(listing.bedrooms).trim() !== '') {
      entryData['Bedrooms'] = String(listing.bedrooms).trim();
    }

    // Bathrooms (Cognito field name: 'Bathrooms', type: string)
    if (listing.bathrooms !== undefined && listing.bathrooms !== null && String(listing.bathrooms).trim() !== '') {
      entryData['Bathrooms'] = String(listing.bathrooms).trim();
    }

    // Square Footage (Cognito field name: 'SqFootage', type: string)
    if (listing.squareFeet !== undefined && listing.squareFeet !== null && String(listing.squareFeet).trim() !== '') {
      const cleanSqft = String(listing.squareFeet).replace(/[^0-9]/g, '').trim();
      entryData['SqFootage'] = cleanSqft || String(listing.squareFeet).trim();
    }

    // Property Type (Cognito field name: 'PropertyType', type: choice dropdown)
    if (listing.propertyType) {
      entryData['PropertyType'] = mapPropertyType(listing.propertyType);
    }

    // Client 1 (Seller 1)
    if (client1First || client1Last) {
      entryData['ClientLegalName'] = { 'First': client1First, 'Last': client1Last };
    }
    if (listing.clientEmail && listing.clientEmail.trim()) {
      entryData['ClientsEmail'] = listing.clientEmail.trim();
    }
    if (listing.clientPhone && listing.clientPhone.trim()) {
      entryData['ClientPhone'] = listing.clientPhone.trim();
    }
    entryData['ClientInCRM'] = 'Yes';

    // Client 2 (Seller 2)
    if (client2First || client2Last) {
      entryData['Client2Name'] = { 'First': client2First, 'Last': client2Last };
    }
    if (listing.client2Email && listing.client2Email.trim()) {
      entryData['Client2Email'] = listing.client2Email.trim();
    }
    if (listing.client2Phone && listing.client2Phone.trim()) {
      entryData['Client2Phone'] = listing.client2Phone.trim();
    }
    if (client2First || client2Last || listing.client2Email || listing.client2Phone) {
      entryData['ClientInCRM2'] = 'Yes';
    }

    // Source of Listing Lead (Cognito field name: 'SourceOfListingLead2', type: choice dropdown)
    if (listing.leadSource) {
      entryData['SourceOfListingLead2'] = mapLeadSource(listing.leadSource);
    }

    // Go Live Date (Cognito field name: 'GoLiveDate', type: date YYYY-MM-DD)
    if (goLive) {
      entryData['GoLiveDate'] = goLive;
    }

    // Listing Price (Cognito field name: 'ListingPrice', type: number)
    if (listing.listPrice && !isNaN(Number(listing.listPrice))) {
      entryData['ListingPrice'] = Math.round(Number(listing.listPrice));
    }

    // Commission Split (Cognito field name: 'CommissionSplitlistingAgent', type: percent decimal)
    if (listing.commissionPercent !== undefined && listing.commissionPercent !== null && !isNaN(Number(listing.commissionPercent))) {
      const commNum = Number(listing.commissionPercent);
      entryData['CommissionSplitlistingAgent'] = commNum > 1 ? commNum / 100 : commNum;
    }

    // HOA default
    entryData['IsThereAnHOA'] = 'NO';

    // Notes
    if (listing.notes && listing.notes.trim()) {
      entryData['Notes'] = listing.notes.trim();
    }

    const encodedEntry = encodeURIComponent(JSON.stringify(entryData));
    return `${COGNITO_NEW_LISTING_FORM_URL}?entry=${encodedEntry}`;
  } catch (err) {
    return COGNITO_NEW_LISTING_FORM_URL;
  }
}

/**
 * Formats a clean, structured text block ready to copy and paste into
 * team emails, Slack, WhatsApp, or directly into the Cognito Form notes.
 */
export function formatListingForTeamIntake(
  listing: Listing,
  user?: { displayName?: string | null; email?: string | null; phoneNumber?: string | null } | null
): string {
  const seller1Name = `${listing.clientFirstName || ''} ${listing.clientLastName || ''}`.trim();
  const seller2Name = `${listing.client2FirstName || ''} ${listing.client2LastName || ''}`.trim();
  const agentName = (listing.agentName || user?.displayName || 'Paul Muner').trim();
  const agentEmail = (listing.agentEmail || user?.email || 'paulmuner@gmail.com').trim();
  const agentPhone = (listing.agentPhone || user?.phoneNumber || '').trim();

  const priceFormatted = listing.listPrice 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.listPrice)
    : 'TBD';

  const fullAddress = [listing.address, listing.city, listing.zipCode].filter(Boolean).join(', ');

  const sections: string[] = [
    `=== ICON REALTY PARTNERS - NEW LISTING INTAKE ===`,
    `Property Address: ${fullAddress || 'N/A'}`,
    `APN / Parcel #: ${listing.apn || 'N/A'}`,
    `MLS #: ${listing.mlsId || 'N/A'}`,
    ...(listing.forSaleDate ? [`For Sale Date: ${listing.forSaleDate}`] : []),
    `List Price: ${priceFormatted}`,
    `Property Type: ${listing.propertyType || 'Residential'}`,
    `Beds / Baths / Sqft: ${listing.bedrooms || '-'}/${listing.bathrooms || '-'} | ${listing.squareFeet ? `${listing.squareFeet} sqft` : '-'}`,
    ``,
    `--- SELLER INFORMATION ---`,
    `Seller 1: ${seller1Name || 'N/A'}`,
    `Phone: ${listing.clientPhone || 'N/A'}`,
    `Email: ${listing.clientEmail || 'N/A'}`,
  ];

  if (seller2Name || listing.client2Phone || listing.client2Email) {
    sections.push(
      `Seller 2: ${seller2Name || 'N/A'}`,
      `Phone: ${listing.client2Phone || 'N/A'}`,
      `Email: ${listing.client2Email || 'N/A'}`
    );
  }

  sections.push(
    ``,
    `--- PREFERRED ESCROW COMPANY ---`,
    `Company: ${listing.escrowCompany || 'N/A'}`,
    `Officer: ${listing.escrowOfficer || 'N/A'}`,
    `Email: ${listing.escrowEmail || 'N/A'}`,
    `Phone: ${listing.escrowPhone || 'N/A'}`
  );

  sections.push(
    ``,
    `--- PREFERRED TITLE COMPANY ---`,
    `Company: ${listing.titleCompany || 'N/A'}`,
    `Officer: ${listing.titleOfficer || 'N/A'}`,
    `Email: ${listing.titleEmail || 'N/A'}`,
    `Phone: ${listing.titlePhone || 'N/A'}`
  );

  sections.push(
    ``,
    `--- LISTING AGENT & COMMISSION ---`,
    `Listing Agent: ${agentName}`,
    ...(listing.coListingAgent ? [`Co-Listing Agent: ${listing.coListingAgent}`] : []),
    ...(agentEmail ? [`Agent Email: ${agentEmail}`] : []),
    ...(agentPhone ? [`Agent Phone: ${agentPhone}`] : []),
    `Commission: ${listing.commissionPercent ? `${listing.commissionPercent}%` : '2.5%'}`
  );

  if (listing.lockboxCode || listing.showingInstructions) {
    sections.push(
      ``,
      `--- ACCESS & SHOWING ---`,
      `Lockbox Code: ${listing.lockboxCode || 'N/A'}`,
      `Instructions: ${listing.showingInstructions || 'N/A'}`
    );
  }

  if (listing.notes) {
    sections.push(
      ``,
      `Notes: ${listing.notes}`
    );
  }

  return sections.join('\n');
}
