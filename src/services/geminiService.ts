export interface ParsedEscrowDoc {
  escrowNumber?: string;
  apn?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientBirthday?: string;
  client2FirstName?: string;
  client2LastName?: string;
  client2Phone?: string;
  client2Email?: string;
  seller1Name?: string;
  seller2Name?: string;
  buyer1Name?: string;
  buyer2Name?: string;
  collaborator?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  cooperatingBrokerage?: string;
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingBrokerage?: string;
  buyerAgentName?: string;
  buyerAgentPhone?: string;
  buyerAgentEmail?: string;
  buyerBrokerage?: string;
  lenderName?: string;
  lenderPhone?: string;
  lenderEmail?: string;
  loanType?: string;
  loanAmount?: number;
  initialDeposit?: number;
  escrowCompany?: string;
  escrowOfficer?: string;
  escrowPhone?: string;
  escrowEmail?: string;
  titleCompany?: string;
  titleOfficer?: string;
  titlePhone?: string;
  titleEmail?: string;
  price?: number;
  commissionPercent?: number;
  netCommission?: number;
  acceptanceDate?: string;
  coeDate?: string;
  coeDays?: number;
  contingencyStartDate?: string;
  loanContingencyDays?: number;
  appraisalContingencyDays?: number;
  inspectionContingencyDays?: number;
  sellerDisclosureDays?: number;
  titleReportDays?: number;
  hoaDocDays?: number;
  insuranceDays?: number;
  leasedItemsDays?: number;
  copDays?: number;
  representation?: 'Buyer' | 'Seller' | 'Dual';
  leadSource?: string;
  status?: string;
  notes?: string;
  contingencyDays?: {
    L1?: number;
    L2?: number;
    L3?: number;
    L4?: number;
    L5?: number;
    L6?: number;
    L7?: number;
    L8?: number;
    L9?: number;
  };
}

export async function parseEscrowFromPdf(base64Pdf: string): Promise<ParsedEscrowDoc | null> {
  return parseFullEscrowRPA(base64Pdf, "application/pdf");
}

export async function parseEscrowFromText(text: string): Promise<ParsedEscrowDoc | null> {
  return parseFullEscrowRPA(text, "text/plain");
}

export async function parseFullEscrowRPA(
  fileData: string,
  mimeType: string,
  fileName?: string,
  userRole?: string
): Promise<ParsedEscrowDoc> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch("/api/scan-rpa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        fileData,
        mimeType: mimeType || "application/pdf",
        fileName: fileName || "Real Estate Contract",
        userRole: userRole || "Buyer",
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      let errorMsg = `Server error (${res.status})`;
      try {
        const json = JSON.parse(errorText);
        if (json.error) errorMsg = json.error;
      } catch {
        if (errorText) errorMsg = errorText.substring(0, 100);
      }
      throw new Error(errorMsg);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || "Failed to extract transaction data from document.");
    }

    return json.data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Document analysis timed out. Please try again or check the file size.");
    }
    throw err;
  }
}
