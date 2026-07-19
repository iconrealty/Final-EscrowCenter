import { Escrow } from '../types';

export function generateCognitoUrl(escrow: Escrow): string {
  const baseUrl = 'https://www.cognitoforms.com/IconRealtyPartners/NewEscrow';
  
  const client1FirstName = escrow.clientFirstName || '';
  const client1LastName = escrow.clientLastName || '';
  const client2FirstName = escrow.client2FirstName || '';
  const client2LastName = escrow.client2LastName || '';
  
  const agentFirstName = escrow.agentName ? escrow.agentName.split(' ')[0] : '';
  const agentLastName = escrow.agentName ? escrow.agentName.split(' ').slice(1).join(' ') : '';

  // Try to match Cognito Form expected field names based on the user's form prompt.
  // Note: Cognito Forms usually strips spaces and special characters for field names.
  // We use objects for Name and Address fields since Cognito Forms uses complex fields for these.
  const entryData: any = {
    "YourName": {
      "First": "Paul",
      "Last": "Muner"
    },
    "YourEmail": "paulmuner@gmail.com",
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
    "UnderContractDate": escrow.acceptanceDate ? new Date(escrow.acceptanceDate).toLocaleDateString() : "",
    "ForecastedCloseDate": escrow.coeDate ? new Date(escrow.coeDate).toLocaleDateString() : "",
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
