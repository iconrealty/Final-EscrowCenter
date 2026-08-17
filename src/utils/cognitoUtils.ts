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

  // Build concise JSON entry payload matching standard Cognito Forms internal field names
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
    entryData["ClientsName"] = { "First": client1FirstName, "Last": client1LastName };
  }
  if (escrow.clientEmail && escrow.clientEmail.trim()) {
    const cleanEmail = escrow.clientEmail.trim();
    entryData["ClientEmail"] = cleanEmail;
    entryData["ClientsEmail"] = cleanEmail;
    entryData["ClientEmailAddress"] = cleanEmail;
    entryData["ClientsEmailAddress"] = cleanEmail;
  }
  if (escrow.clientPhone && escrow.clientPhone.trim()) {
    const cleanPhone = escrow.clientPhone.trim();
    entryData["ClientPhone"] = cleanPhone;
    entryData["ClientsPhone"] = cleanPhone;
    entryData["ClientPhoneNumber"] = cleanPhone;
    entryData["ClientsPhoneNumber"] = cleanPhone;
    entryData["ClientContactNumber"] = cleanPhone;
    entryData["ClientsContactNumber"] = cleanPhone;
  }

  if (client2FirstName || client2LastName) {
    entryData["Client2Name"] = { "First": client2FirstName, "Last": client2LastName };
    entryData["Clients2Name"] = { "First": client2FirstName, "Last": client2LastName };
    entryData["Client2sName"] = { "First": client2FirstName, "Last": client2LastName };
  }
  if (escrow.client2Email && escrow.client2Email.trim()) {
    const clean2Email = escrow.client2Email.trim();
    entryData["Client2Email"] = clean2Email;
    entryData["Clients2Email"] = clean2Email;
    entryData["Client2sEmail"] = clean2Email;
    entryData["Client2EmailAddress"] = clean2Email;
    entryData["Client2sEmailAddress"] = clean2Email;
  }
  if (escrow.client2Phone && escrow.client2Phone.trim()) {
    const clean2Phone = escrow.client2Phone.trim();
    entryData["Client2Phone"] = clean2Phone;
    entryData["Clients2Phone"] = clean2Phone;
    entryData["Client2sPhone"] = clean2Phone;
    entryData["Client2PhoneNumber"] = clean2Phone;
    entryData["Clients2PhoneNumber"] = clean2Phone;
    entryData["Client2sPhoneNumber"] = clean2Phone;
    entryData["Client2ContactNumber"] = clean2Phone;
  }

  if (escrow.address) {
    entryData["PropertyAddress"] = { "Line1": escrow.address };
  }

  if (escrow.price) {
    entryData["TransactionAmount"] = escrow.price;
  }
  if (escrow.commissionPercent !== undefined && escrow.commissionPercent !== null && !isNaN(Number(escrow.commissionPercent))) {
    // Cognito Forms percentage fields expect a decimal fraction (e.g., 0.025 for 2.5%, 0.03 for 3%)
    const commNum = Number(escrow.commissionPercent);
    entryData["YourCommission"] = commNum / 100;
  }

  if (agentFirstName || agentLastName) {
    entryData["OtherAgentsName"] = { "First": agentFirstName, "Last": agentLastName };
    entryData["OtherAgentName"] = { "First": agentFirstName, "Last": agentLastName };
  }
  if (escrow.agentPhone && escrow.agentPhone.trim()) {
    const cleanAgPhone = escrow.agentPhone.trim();
    entryData["OtherAgentsPhoneNumber"] = cleanAgPhone;
    entryData["OtherAgentPhoneNumber"] = cleanAgPhone;
    entryData["OtherAgentsPhone"] = cleanAgPhone;
    entryData["OtherAgentPhone"] = cleanAgPhone;
  }
  if (escrow.agentEmail && escrow.agentEmail.trim()) {
    const cleanAgEmail = escrow.agentEmail.trim();
    entryData["OtherAgentsEmail"] = cleanAgEmail;
    entryData["OtherAgentEmail"] = cleanAgEmail;
  }
  if (escrow.cooperatingBrokerage && escrow.cooperatingBrokerage.trim()) {
    const cleanBrokerage = escrow.cooperatingBrokerage.trim();
    entryData["OtherAgentsBrokerage"] = cleanBrokerage;
    entryData["OtherAgentBrokerage"] = cleanBrokerage;
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

  if (escrow.lenderName && escrow.lenderName.trim()) {
    const cleanLender = escrow.lenderName.trim();
    entryData["LenderUsed"] = cleanLender;
    entryData["LenderName"] = cleanLender;
  }
  if (escrow.lenderPhone && escrow.lenderPhone.trim()) {
    const cleanLendPhone = escrow.lenderPhone.trim();
    entryData["LenderPhoneNumber"] = cleanLendPhone;
    entryData["LenderPhone"] = cleanLendPhone;
    entryData["LenderContactNumber"] = cleanLendPhone;
  }
  if (escrow.lenderEmail && escrow.lenderEmail.trim()) {
    const cleanLendEmail = escrow.lenderEmail.trim();
    entryData["LenderEmail"] = cleanLendEmail;
    entryData["LenderEmailAddress"] = cleanLendEmail;
  }

  if (escrow.escrowCompany && escrow.escrowCompany.trim()) {
    const cleanEscComp = escrow.escrowCompany.trim();
    entryData["EscrowCompany"] = cleanEscComp;
  }
  if (escrow.escrowPhone && escrow.escrowPhone.trim()) {
    const cleanEscPhone = escrow.escrowPhone.trim();
    entryData["EscrowContactNumber"] = cleanEscPhone;
    entryData["EscrowPhoneNumber"] = cleanEscPhone;
    entryData["EscrowPhone"] = cleanEscPhone;
  }
  if (escrow.escrowEmail && escrow.escrowEmail.trim()) {
    const cleanEscEmail = escrow.escrowEmail.trim();
    entryData["EscrowEmail"] = cleanEscEmail;
    entryData["EscrowEmailAddress"] = cleanEscEmail;
  }

  const jsonString = JSON.stringify(entryData);
  const encodedJson = encodeURIComponent(jsonString);

  return `${baseUrl}?entry=${encodedJson}`;
}
