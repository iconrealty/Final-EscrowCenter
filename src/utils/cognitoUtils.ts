import { Escrow } from '../types';
import { parseISO, format } from 'date-fns';

function formatDateForCognito(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isNaN(date.getTime())) {
      return format(date, 'MM/dd/yyyy');
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

  // If logged-in user has no displayName or email, try to get them from the escrow's primary agent
  if (!currentUserName && escrow.agentName) {
    currentUserName = escrow.agentName.trim();
  }
  if (!currentUserEmail && escrow.agentEmail) {
    currentUserEmail = escrow.agentEmail.trim();
  }

  // Absolute final fallback
  if (!currentUserName) {
    currentUserName = "Paul Muner";
  }
  if (!currentUserEmail) {
    currentUserEmail = "paulmuner@gmail.com";
  }

  const currentUserFirstName = currentUserName.split(' ')[0] || "";
  const currentUserLastName = currentUserName.split(' ').slice(1).join(' ') || "";

  const formattedUnderContract = formatDateForCognito(escrow.acceptanceDate);
  const formattedForecastedClose = formatDateForCognito(escrow.coeDate);

  // Try to match Cognito Form expected field names based on the user's form prompt.
  // Note: Cognito Forms usually strips spaces and special characters for field names.
  // We use objects for Name and Address fields since Cognito Forms uses complex fields for these.
  const entryData: any = {
    "YourName": {
      "First": currentUserFirstName,
      "Last": currentUserLastName
    },
    "YourEmail": currentUserEmail,
    "TransactionType": escrow.representation || "Buyer",
    "ClientName": {
      "First": client1FirstName,
      "Last": client1LastName
    },
    "ClientSEmail": escrow.clientEmail || "",
    "ClientsEmail": escrow.clientEmail || "",
    "ClientEmail": escrow.clientEmail || "",
    "ClientSPhone": escrow.clientPhone || "",
    "ClientsPhone": escrow.clientPhone || "",
    "ClientPhone": escrow.clientPhone || "",
    "ClientsAddress": {
      "Line1": escrow.address || ""
    },
    "ClientSAddress": {
      "Line1": escrow.address || ""
    },
    "Client2Name": {
      "First": client2FirstName,
      "Last": client2LastName
    },
    "Client2Email": escrow.client2Email || "",
    "Client2Phone": escrow.client2Phone || "",
    "PropertyAddress": {
      "Line1": escrow.address || ""
    },
    "TransactionAmount": escrow.price ? escrow.price.toString() : "",
    "YourCommission": escrow.commissionPercent ? escrow.commissionPercent.toString() : "",
    "YourCommissionPercent": escrow.commissionPercent ? escrow.commissionPercent.toString() : "",
    "YourCommissionPercentage": escrow.commissionPercent ? escrow.commissionPercent.toString() : "",
    "OtherAgentsName": {
      "First": agentFirstName,
      "Last": agentLastName
    },
    "OtherAgentsPhoneNumber": escrow.agentPhone || "",
    "OtherAgentsEmail": escrow.agentEmail || "",
    "OtherAgentName": {
      "First": agentFirstName,
      "Last": agentLastName
    },
    "OtherAgentPhoneNumber": escrow.agentPhone || "",
    "OtherAgentEmail": escrow.agentEmail || "",
    "UnderContractDate": formattedUnderContract,
    "UnderContract": formattedUnderContract,
    "ContractDate": formattedUnderContract,
    "ForecastedCloseDate": formattedForecastedClose,
    "ForecastedClose": formattedForecastedClose,
    "CloseDate": formattedForecastedClose,
    "COEDate": formattedForecastedClose,
    "LenderUsed": escrow.lenderName || "",
    "LenderPhoneNumber": escrow.lenderPhone || "",
    "LenderEmail": escrow.lenderEmail || "",
    "EscrowCompany": escrow.escrowCompany || "",
    "EscrowContactNumber": escrow.escrowPhone || "",
    "EscrowEmail": escrow.escrowEmail || "",
  };

  const jsonString = JSON.stringify(entryData);
  const encodedJson = encodeURIComponent(jsonString);

  return `${baseUrl}?entry=${encodedJson}`;
}
