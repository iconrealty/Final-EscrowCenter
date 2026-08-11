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

  // Construct comprehensive entry JSON object matching Cognito Forms internal field names
  const entryData: Record<string, any> = {
    // Agent / User Name
    "YourName": {
      "First": currentUserFirstName,
      "Last": currentUserLastName
    },
    "YourEmail": currentUserEmail,
    "AgentName": {
      "First": currentUserFirstName,
      "Last": currentUserLastName
    },
    "AgentEmail": currentUserEmail,

    // Transaction Type
    "TransactionType": escrow.representation || "Buyer",
    "Representation": escrow.representation || "Buyer",

    // Clients
    "ClientName": {
      "First": client1FirstName,
      "Last": client1LastName
    },
    "ClientsName": {
      "First": client1FirstName,
      "Last": client1LastName
    },
    "Client1Name": {
      "First": client1FirstName,
      "Last": client1LastName
    },
    "ClientEmail": escrow.clientEmail || "",
    "ClientsEmail": escrow.clientEmail || "",
    "ClientSEmail": escrow.clientEmail || "",
    "ClientPhone": escrow.clientPhone || "",
    "ClientsPhone": escrow.clientPhone || "",
    "ClientSPhone": escrow.clientPhone || "",
    
    "ClientsAddress": {
      "Line1": escrow.address || ""
    },
    "ClientSAddress": {
      "Line1": escrow.address || ""
    },
    "ClientAddress": {
      "Line1": escrow.address || ""
    },

    "Client2Name": {
      "First": client2FirstName,
      "Last": client2LastName
    },
    "Client2Email": escrow.client2Email || "",
    "Client2Phone": escrow.client2Phone || "",

    // Property Address
    "PropertyAddress": {
      "Line1": escrow.address || ""
    },
    "Address": {
      "Line1": escrow.address || ""
    },

    // Transaction & Commission Amounts
    "TransactionAmount": escrow.price || 0,
    "PurchasePrice": escrow.price || 0,
    "Price": escrow.price || 0,
    "YourCommission": escrow.commissionPercent || 0,
    "YourCommissionPercent": escrow.commissionPercent || 0,
    "YourCommissionPercentage": escrow.commissionPercent || 0,

    // Other / Cooperating Agent
    "OtherAgentsName": {
      "First": agentFirstName,
      "Last": agentLastName
    },
    "OtherAgentName": {
      "First": agentFirstName,
      "Last": agentLastName
    },
    "CooperatingAgentName": {
      "First": agentFirstName,
      "Last": agentLastName
    },
    "OtherAgentsPhoneNumber": escrow.agentPhone || "",
    "OtherAgentPhoneNumber": escrow.agentPhone || "",
    "OtherAgentsEmail": escrow.agentEmail || "",
    "OtherAgentEmail": escrow.agentEmail || "",
    
    // Other Agent's Brokerage
    "OtherAgentsBrokerage": escrow.cooperatingBrokerage || "",
    "OtherAgentBrokerage": escrow.cooperatingBrokerage || "",
    "CooperatingBrokerage": escrow.cooperatingBrokerage || "",
    "OtherBrokerage": escrow.cooperatingBrokerage || "",
    "OtherAgentsBrokerageName": escrow.cooperatingBrokerage || "",

    // Smart Defaults requested for Cognito Form fields
    "HowManyOffersDidYouSubmitIncludingThisOneForThisClientBeforeYouReceivedAnAcceptance": 1,
    "HowManyOffersDidYouSubmit": 1,
    "HowManyOffersDidYouSubmit1": 1,
    "OffersSubmitted": 1,
    "HowManyOffers": 1,
    "Offers": 1,
    "NumberOfOffersSubmitted": 1,

    "IsThereAnOutsideReferral": "No",
    "OutsideReferral": "No",
    "IsThereAnOutsideReferral1": "No",
    "Referral": "No",

    "WillYourClientBeInTownDuringTheEntireEscrowIfNotYouNeedToSetUpApptForThemToSignWithEscrowOutOfTheCountry": "Yes",
    "WillYourClientBeInTownDuringTheEntireEscrow": "Yes",
    "WillClientBeInTown": "Yes",
    "ClientInTown": "Yes",
    "InTown": "Yes",

    "HowWouldYourClientToBeCommunicated": ["Text", "Call", "Email"],
    "HowWouldYourClientLikeToBeCommunicated": ["Text", "Call", "Email"],
    "CommunicationPreference": ["Text", "Call", "Email"],

    // Contract Dates
    "UnderContractDate": formattedUnderContract,
    "UnderContract": formattedUnderContract,
    "ContractDate": formattedUnderContract,
    "AcceptanceDate": formattedUnderContract,
    "ForecastedCloseDate": formattedForecastedClose,
    "ForecastedClose": formattedForecastedClose,
    "CloseDate": formattedForecastedClose,
    "COEDate": formattedForecastedClose,

    // Lender & Escrow Details
    "LenderUsed": escrow.lenderName || "",
    "LenderName": escrow.lenderName || "",
    "LenderPhoneNumber": escrow.lenderPhone || "",
    "LenderPhone": escrow.lenderPhone || "",
    "LenderEmail": escrow.lenderEmail || "",
    "EscrowCompany": escrow.escrowCompany || "",
    "EscrowContactNumber": escrow.escrowPhone || "",
    "EscrowPhone": escrow.escrowPhone || "",
    "EscrowEmail": escrow.escrowEmail || "",
  };

  const jsonString = JSON.stringify(entryData);
  const encodedJson = encodeURIComponent(jsonString);

  return `${baseUrl}?entry=${encodedJson}`;
}
