import { Listing } from '../types';

export const COGNITO_NEW_LISTING_FORM_URL = 'https://www.cognitoforms.com/IconRealtyPartners/NewListingIntakeForm';

/**
 * Builds a URL that opens the Cognito Form with listing data pre-filled where supported.
 * Cognito Forms accepts JSON prefill via the entry parameter: ?entry={"Field":"Value"}
 */
export function buildCognitoFormPrefillUrl(
  listing: Listing,
  user?: { displayName?: string | null; email?: string | null; phoneNumber?: string | null } | null
): string {
  try {
    const agentName = (listing.agentName || user?.displayName || 'Paul Muner').trim();
    const agentEmail = (listing.agentEmail || user?.email || 'paulmuner@gmail.com').trim();
    const agentPhone = (listing.agentPhone || user?.phoneNumber || '').trim();
    
    const nameParts = agentName.split(' ');
    const agentFirstName = nameParts[0] || '';
    const agentLastName = nameParts.slice(1).join(' ') || '';

    const entryData: Record<string, any> = {
      PropertyAddress: {
        Line1: listing.address || '',
        City: listing.city || '',
        State: 'CA',
        PostalCode: listing.zipCode || '',
      },
      Address: listing.address || '',
      City: listing.city || '',
      ZipCode: listing.zipCode || '',
      APN: listing.apn || '',
      MLSNumber: listing.mlsId || '',
      ListPrice: listing.listPrice || 0,
      PropertyType: listing.propertyType || '',
      Bedrooms: listing.bedrooms || '',
      Bathrooms: listing.bathrooms || '',
      SquareFeet: listing.squareFeet || '',
      SellerName: `${listing.clientFirstName || ''} ${listing.clientLastName || ''}`.trim(),
      SellerEmail: listing.clientEmail || '',
      SellerPhone: listing.clientPhone || '',
      Seller2Name: `${listing.client2FirstName || ''} ${listing.client2LastName || ''}`.trim(),
      Seller2Email: listing.client2Email || '',
      Seller2Phone: listing.client2Phone || '',
      EscrowCompany: listing.escrowCompany || '',
      EscrowOfficer: listing.escrowOfficer || '',
      EscrowEmail: listing.escrowEmail || '',
      EscrowPhone: listing.escrowPhone || '',
      TitleCompany: listing.titleCompany || '',
      TitleOfficer: listing.titleOfficer || '',
      TitleEmail: listing.titleEmail || '',
      TitlePhone: listing.titlePhone || '',
      ListingAgent: agentName,
      AgentName: agentName,
      CoListingAgent: listing.coListingAgent || '',
      YourName: { First: agentFirstName, Last: agentLastName },
      YourEmail: agentEmail,
      AgentPhone: agentPhone,
      AgentEmail: agentEmail,
      Notes: listing.notes || '',
    };

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
