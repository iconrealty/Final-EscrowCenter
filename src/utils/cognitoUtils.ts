import { Escrow, parseAddressComponents } from '../types';
import { parseISO, format } from 'date-fns';

function formatDateForCognito(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isNaN(date.getTime())) {
      // Cognito Forms JSON entry requires ISO standard YYYY-MM-DD for date fields
      return format(date, 'yyyy-MM-dd');
    }
  } catch (e) {
    console.error('Error formatting date for Cognito:', e);
  }
  return dateStr;
}

export function generateCognitoUrl(escrow: Escrow, user?: { displayName?: string | null, email?: string | null } | null): string {
  const baseUrl = 'https://www.cognitoforms.com/IconRealtyPartners/NewEscrow';
  
  const client1FirstName = (escrow.clientFirstName || '').trim();
  const client1LastName = (escrow.clientLastName || '').trim();
  const client2FirstName = (escrow.client2FirstName || '').trim();
  const client2LastName = (escrow.client2LastName || '').trim();
  
  const agentFirstName = escrow.agentName ? escrow.agentName.trim().split(' ')[0] : '';
  const agentLastName = escrow.agentName ? escrow.agentName.trim().split(' ').slice(1).join(' ') : '';

  let currentUserName = (user?.displayName || "").trim();
  let currentUserEmail = (user?.email || "").trim();

  if (!currentUserName && escrow.agentName) {
    currentUserName = escrow.agentName.trim();
  }
  if (!currentUserEmail && escrow.agentEmail) {
    currentUserEmail = escrow.agentEmail.trim();
  }

  const currentUserFirstName = currentUserName ? currentUserName.split(' ')[0] : '';
  const currentUserLastName = currentUserName ? currentUserName.split(' ').slice(1).join(' ') : '';

  const formattedUnderContract = formatDateForCognito(escrow.acceptanceDate);
  const formattedForecastedClose = formatDateForCognito(escrow.coeDate);

  // Build clean, concise JSON entry payload matching canonical Cognito Forms field names
  // Keeping this compact prevents HTTP 404 / 414 URL length errors in Chrome and Safari
  const entryData: Record<string, any> = {};

  if (currentUserFirstName || currentUserLastName) {
    entryData["YourName"] = { "First": currentUserFirstName, "Last": currentUserLastName };
  }
  if (currentUserEmail) {
    entryData["YourEmail"] = currentUserEmail;
  }

  if (escrow.representation) {
    entryData["TransactionType"] = escrow.representation;
  }

  if (client1FirstName || client1LastName) {
    entryData["ClientName"] = { "First": client1FirstName, "Last": client1LastName };
  }
  if (escrow.clientEmail && escrow.clientEmail.trim()) {
    entryData["ClientEmail"] = escrow.clientEmail.trim();
  }
  if (escrow.clientPhone && escrow.clientPhone.trim()) {
    entryData["ClientPhone"] = escrow.clientPhone.trim();
  }

  if (client2FirstName || client2LastName) {
    entryData["Client2Name"] = { "First": client2FirstName, "Last": client2LastName };
  }
  if (escrow.client2Email && escrow.client2Email.trim()) {
    entryData["Client2Email"] = escrow.client2Email.trim();
  }
  if (escrow.client2Phone && escrow.client2Phone.trim()) {
    entryData["Client2Phone"] = escrow.client2Phone.trim();
  }

  // Parse or retrieve address components
  let streetAddress = (escrow.address || '').trim();
  let propertyCity = (escrow.city || '').trim();
  let propertyZip = (escrow.zipCode || '').trim();

  // If city or zip are missing on legacy records, attempt to parse from address string
  if ((!propertyCity || !propertyZip) && streetAddress) {
    const parsedAddr = parseAddressComponents(streetAddress);
    if (!propertyCity && parsedAddr.city) propertyCity = parsedAddr.city;
    if (!propertyZip && parsedAddr.zipCode) propertyZip = parsedAddr.zipCode;
    if (parsedAddr.address && (parsedAddr.city || parsedAddr.zipCode)) {
      streetAddress = parsedAddr.address;
    }
  }

  // Normalize Unit#24 to Unit 24 to keep address formatting clean
  streetAddress = streetAddress.replace(/Unit#/i, 'Unit ').replace(/#(\d+)/, 'Unit $1');

  if (streetAddress || propertyCity || propertyZip) {
    const addressObj: Record<string, string> = {};
    if (streetAddress) addressObj["Line1"] = streetAddress;
    if (propertyCity) addressObj["City"] = propertyCity;
    if (propertyZip) addressObj["PostalCode"] = propertyZip;
    entryData["PropertyAddress"] = addressObj;
  }

  if (escrow.apn && escrow.apn.trim()) {
    entryData["APN"] = escrow.apn.trim();
  }

  if (escrow.price && !isNaN(Number(escrow.price))) {
    entryData["TransactionAmount"] = Number(escrow.price);
  }
  if (escrow.commissionPercent !== undefined && escrow.commissionPercent !== null && !isNaN(Number(escrow.commissionPercent))) {
    // Cognito Forms percentage fields expect a decimal fraction (e.g., 0.025 for 2.5%, 0.03 for 3%)
    const commNum = Number(escrow.commissionPercent);
    entryData["YourCommission"] = commNum > 1 ? commNum / 100 : commNum;
  }

  if (agentFirstName || agentLastName) {
    entryData["OtherAgentsName"] = { "First": agentFirstName, "Last": agentLastName };
  }
  if (escrow.agentPhone && escrow.agentPhone.trim()) {
    entryData["OtherAgentsPhone"] = escrow.agentPhone.trim();
  }
  if (escrow.agentEmail && escrow.agentEmail.trim()) {
    entryData["OtherAgentsEmail"] = escrow.agentEmail.trim();
  }
  if (escrow.cooperatingBrokerage && escrow.cooperatingBrokerage.trim()) {
    entryData["OtherAgentsBrokerage"] = escrow.cooperatingBrokerage.trim();
  }

  if (formattedUnderContract) {
    entryData["UnderContractDate"] = formattedUnderContract;
  }
  if (formattedForecastedClose) {
    entryData["ForecastedCloseDate"] = formattedForecastedClose;
  }

  if (escrow.lenderName && escrow.lenderName.trim()) {
    entryData["LenderUsed"] = escrow.lenderName.trim();
  }
  if (escrow.lenderPhone && escrow.lenderPhone.trim()) {
    entryData["LenderPhone"] = escrow.lenderPhone.trim();
  }
  if (escrow.lenderEmail && escrow.lenderEmail.trim()) {
    entryData["LenderEmail"] = escrow.lenderEmail.trim();
  }

  if (escrow.escrowCompany && escrow.escrowCompany.trim()) {
    entryData["EscrowCompany"] = escrow.escrowCompany.trim();
  }
  if (escrow.escrowPhone && escrow.escrowPhone.trim()) {
    entryData["EscrowPhone"] = escrow.escrowPhone.trim();
  }
  if (escrow.escrowEmail && escrow.escrowEmail.trim()) {
    entryData["EscrowEmail"] = escrow.escrowEmail.trim();
  }

  const jsonString = JSON.stringify(entryData);
  const encodedJson = encodeURIComponent(jsonString);

  return `${baseUrl}?entry=${encodedJson}`;
}

