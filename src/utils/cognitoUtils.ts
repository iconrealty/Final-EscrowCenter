import { Escrow } from '../types';
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
  
  const client1FirstName = escrow.clientFirstName || '';
  const client1LastName = escrow.clientLastName || '';
  const client2FirstName = escrow.client2FirstName || '';
  const client2LastName = escrow.client2LastName || '';
  
  const agentFirstName = escrow.agentName ? escrow.agentName.split(' ')[0] : '';
  const agentLastName = escrow.agentName ? escrow.agentName.split(' ').slice(1).join(' ') : '';

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

  // Build clean, focused JSON entry payload matching Cognito Forms schema
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
  if (escrow.clientEmail) {
    entryData["ClientEmail"] = escrow.clientEmail;
  }
  if (escrow.clientPhone) {
    entryData["ClientPhone"] = escrow.clientPhone;
  }

  if (client2FirstName || client2LastName) {
    entryData["Client2Name"] = { "First": client2FirstName, "Last": client2LastName };
  }
  if (escrow.client2Email) {
    entryData["Client2Email"] = escrow.client2Email;
  }
  if (escrow.client2Phone) {
    entryData["Client2Phone"] = escrow.client2Phone;
  }

  if (escrow.address) {
    entryData["PropertyAddress"] = { "Line1": escrow.address };
  }

  if (escrow.price) {
    entryData["TransactionAmount"] = escrow.price;
  }
  if (escrow.commissionPercent) {
    entryData["YourCommission"] = escrow.commissionPercent;
  }

  if (agentFirstName || agentLastName) {
    entryData["OtherAgentsName"] = { "First": agentFirstName, "Last": agentLastName };
  }
  if (escrow.agentPhone) {
    entryData["OtherAgentsPhoneNumber"] = escrow.agentPhone;
  }
  if (escrow.agentEmail) {
    entryData["OtherAgentsEmail"] = escrow.agentEmail;
  }
  if (escrow.cooperatingBrokerage) {
    entryData["OtherAgentsBrokerage"] = escrow.cooperatingBrokerage;
  }

  // Pre-fill answers requested by user
  entryData["HowManyOffersDidYouSubmitIncludingThisOneForThisClientBeforeYouReceivedAnAcceptance"] = 1;
  entryData["IsThereAnOutsideReferral"] = "No";
  entryData["WillYourClientBeInTownDuringTheEntireEscrowIfNotYouNeedToSetUpApptForThemToSignWithEscrowOutOfTheCountry"] = "Yes";

  if (formattedUnderContract) {
    entryData["UnderContractDate"] = formattedUnderContract;
  }
  if (formattedForecastedClose) {
    entryData["ForecastedCloseDate"] = formattedForecastedClose;
  }

  if (escrow.lenderName) {
    entryData["LenderUsed"] = escrow.lenderName;
  }
  if (escrow.lenderPhone) {
    entryData["LenderPhoneNumber"] = escrow.lenderPhone;
  }
  if (escrow.lenderEmail) {
    entryData["LenderEmail"] = escrow.lenderEmail;
  }

  if (escrow.escrowCompany) {
    entryData["EscrowCompany"] = escrow.escrowCompany;
  }
  if (escrow.escrowPhone) {
    entryData["EscrowContactNumber"] = escrow.escrowPhone;
  }
  if (escrow.escrowEmail) {
    entryData["EscrowEmail"] = escrow.escrowEmail;
  }

  const jsonString = JSON.stringify(entryData);
  const encodedJson = encodeURIComponent(jsonString);

  return `${baseUrl}?entry=${encodedJson}`;
}
