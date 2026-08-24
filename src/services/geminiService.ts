import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  try {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "undefined") {
        console.warn("GEMINI_API_KEY not found in environment, checking fallback...");
      }
      aiInstance = new GoogleGenAI({
        apiKey: apiKey || "",
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiInstance;
  } catch (error) {
    console.error("Error in getAi initialization:", error);
    throw error;
  }
}

export async function parseEscrowFromPdf(base64Pdf: string): Promise<any> {
  return parseFullEscrowRPA(base64Pdf, "application/pdf");
}

export async function parseEscrowFromText(text: string): Promise<any> {
  return parseFullEscrowRPA(text, "text/plain");
}

export async function parseFullEscrowRPA(
  fileData: string,
  mimeType: string,
  fileName?: string
): Promise<any> {
  const ai = getAi();

  let base64Clean = fileData;
  let actualMimeType = mimeType || "application/pdf";
  if (typeof fileData === "string" && fileData.includes(",")) {
    const parts = fileData.split(",");
    const header = parts[0];
    base64Clean = parts[1];
    const match = header.match(/data:([^;]+);base64/);
    if (match && match[1]) {
      actualMimeType = match[1];
    }
  }
  if (typeof base64Clean === "string") {
    base64Clean = base64Clean.replace(/\s/g, "");
  }

  const promptText = `
You are an expert California Real Estate Transaction Coordinator (TC) and Escrow Assistant specializing in California Residential Purchase Agreements (C.A.R. Form RPA-CA), Addenda, and MLS Listing Sheets.
Analyze the provided document (${fileName || "Real Estate Document"}) and extract all transaction, property, client, agent, escrow, title, and contingency timeline details.

CRITICAL INSTRUCTIONS FOR CALIFORNIA RPA & MLS FORMS:
1. PARAGRAPH 3 GRID (Pages 1-3 of RPA-CA):
   - 3A: Purchase Price (number, e.g. 850000)
   - 3B: Close of Escrow (COE) Date (convert to YYYY-MM-DD). If stated as "X days from acceptance", calculate COE based on acceptance date or leave standard.
   - 3D(1): Initial Deposit (EMD)
   - 3E: Loan Amount, financing terms (Conventional, FHA, VA, Cash)
   - 3L: Contingency timelines in days:
        * Loan (L1): default 14 or specified number of days
        * Appraisal (L2): default 17 (or 10) or specified number of days
        * Investigation / Physical Inspection (L3): default 17 (or 7) or specified number of days
        * Insurance (L4): default 17 (or 7) or specified number of days
        * Seller Documents (L5): default 7 or specified number of days
        * Title Report (L6): default 7 or specified number of days
        * Common Interest / HOA (L7): default 7 or specified number of days
        * Leased Items (L8): default 7 or specified number of days
        * Sale of Buyer's Property / COP (L9): default 17 or specified number of days
   - Document Header / Grid:
        * Property Address (street address, e.g. 1206 Louise St)
        * City (e.g. Santa Ana)
        * Zip Code (e.g. 92703)
        * APN (Assessor's Parcel Number, e.g. 402-192-14)
        * Buyer Full Names -> clientFirstName, clientLastName (and client2 if second buyer)
        * Seller Full Names
2. REAL ESTATE BROKERS & ESCROW CONFIRMATION (Page 16 or Final Pages of RPA-CA):
   - Real Estate Broker Firm (Listing Broker & Buyer Broker), DRE License Numbers
   - Real Estate Agents (Listing Agent & Buyer's Agent), Full Names, DRE #s, Email, Phone
   - Cooperating Brokerage name
   - Escrow Holder Section: Escrow Company Name, Escrow Officer Name, Escrow Number, Phone, Email
   - Title Company / Officer contact details if specified
   - Date of Final Acceptance / Mutual Acceptance Date (convert to YYYY-MM-DD)
3. COMMISSIONS & REPRESENTATION:
   - Identify if representing Buyer, Seller, or Dual
   - Commission Percent (e.g. 2.5) or Net Commission if stated
   - If commission percent and price are available, compute net commission
4. MLS SHEETS (if uploaded):
   - Extract Address, City, Zip, APN, List Price, Listing Agent Name/Phone/Email, Listing Brokerage, Buyer Broker Commission (BAC/BBAC %)
5. Output format: Return all dates formatted strictly as YYYY-MM-DD. Clean all text strings.
`;

  const candidateModels = [
    "gemini-3.7-flash",
    "gemini-flash-latest"
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const dataPart = actualMimeType === "text/plain"
        ? { text: base64Clean }
        : { inlineData: { mimeType: actualMimeType, data: base64Clean } };

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              dataPart,
              { text: promptText },
            ],
          },
        ],
        config: {
          systemInstruction: "You are a fast, accurate Real Estate Document and California RPA contract parser that outputs strict JSON matching the schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              escrowNumber: { type: Type.STRING, description: "Escrow file number if present" },
              apn: { type: Type.STRING, description: "Assessor's Parcel Number (APN) e.g. 402-192-14" },
              address: { type: Type.STRING, description: "Property street address without city/zip" },
              city: { type: Type.STRING, description: "City name" },
              zipCode: { type: Type.STRING, description: "5-digit zip code" },
              clientFirstName: { type: Type.STRING, description: "First name of primary buyer or client" },
              clientLastName: { type: Type.STRING, description: "Last name of primary buyer or client" },
              clientPhone: { type: Type.STRING, description: "Phone number of client" },
              clientEmail: { type: Type.STRING, description: "Email address of client" },
              clientBirthday: { type: Type.STRING, description: "Client birthday YYYY-MM-DD if available" },
              client2FirstName: { type: Type.STRING, description: "First name of co-buyer or second client" },
              client2LastName: { type: Type.STRING, description: "Last name of co-buyer or second client" },
              client2Phone: { type: Type.STRING, description: "Phone of second client" },
              client2Email: { type: Type.STRING, description: "Email of second client" },
              seller1Name: { type: Type.STRING, description: "Seller full name or entity" },
              seller2Name: { type: Type.STRING, description: "Second seller full name or entity" },
              buyer1Name: { type: Type.STRING, description: "Buyer 1 full name" },
              buyer2Name: { type: Type.STRING, description: "Buyer 2 full name" },
              collaborator: { type: Type.STRING, description: "Co-agent or collaborator" },
              agentName: { type: Type.STRING, description: "Cooperating agent full name" },
              agentPhone: { type: Type.STRING, description: "Cooperating agent phone" },
              agentEmail: { type: Type.STRING, description: "Cooperating agent email" },
              cooperatingBrokerage: { type: Type.STRING, description: "Cooperating broker firm name" },
              listingAgentName: { type: Type.STRING, description: "Listing agent name" },
              listingAgentPhone: { type: Type.STRING, description: "Listing agent phone" },
              listingAgentEmail: { type: Type.STRING, description: "Listing agent email" },
              listingBrokerage: { type: Type.STRING, description: "Listing brokerage company" },
              buyerAgentName: { type: Type.STRING, description: "Buyer's agent name" },
              buyerAgentPhone: { type: Type.STRING, description: "Buyer's agent phone" },
              buyerAgentEmail: { type: Type.STRING, description: "Buyer's agent email" },
              buyerBrokerage: { type: Type.STRING, description: "Buyer brokerage company" },
              lenderName: { type: Type.STRING, description: "Lender company or loan officer name" },
              lenderPhone: { type: Type.STRING, description: "Lender phone number" },
              lenderEmail: { type: Type.STRING, description: "Lender email address" },
              loanType: { type: Type.STRING, description: "Loan type e.g. Conventional, FHA, VA, Cash" },
              loanAmount: { type: Type.NUMBER, description: "Loan amount in dollars" },
              initialDeposit: { type: Type.NUMBER, description: "Initial earnest money deposit EMD in dollars" },
              escrowCompany: { type: Type.STRING, description: "Escrow company name" },
              escrowOfficer: { type: Type.STRING, description: "Escrow officer full name" },
              escrowPhone: { type: Type.STRING, description: "Escrow officer phone number" },
              escrowEmail: { type: Type.STRING, description: "Escrow officer email address" },
              titleCompany: { type: Type.STRING, description: "Title company name" },
              titleOfficer: { type: Type.STRING, description: "Title officer name" },
              titlePhone: { type: Type.STRING, description: "Title contact phone" },
              titleEmail: { type: Type.STRING, description: "Title contact email" },
              price: { type: Type.NUMBER, description: "Purchase price / contract price" },
              commissionPercent: { type: Type.NUMBER, description: "Commission percentage (e.g. 2.5)" },
              netCommission: { type: Type.NUMBER, description: "Calculated or stated net commission dollar amount" },
              acceptanceDate: { type: Type.STRING, description: "Date of final acceptance YYYY-MM-DD" },
              coeDate: { type: Type.STRING, description: "Close of escrow date YYYY-MM-DD" },
              coeDays: { type: Type.NUMBER, description: "Close of escrow timeline in days from acceptance (e.g. 30)" },
              contingencyStartDate: { type: Type.STRING, description: "Contingency timeline start date YYYY-MM-DD" },
              loanContingencyDays: { type: Type.NUMBER, description: "Loan contingency duration in days (default 14)" },
              appraisalContingencyDays: { type: Type.NUMBER, description: "Appraisal contingency duration in days (default 17 or 10)" },
              inspectionContingencyDays: { type: Type.NUMBER, description: "Physical investigation/inspection duration in days (default 17 or 7)" },
              sellerDisclosureDays: { type: Type.NUMBER, description: "Seller disclosures duration in days (default 7)" },
              titleReportDays: { type: Type.NUMBER, description: "Title review contingency duration in days (default 7)" },
              hoaDocDays: { type: Type.NUMBER, description: "HOA / Common Interest doc review in days (default 7)" },
              insuranceDays: { type: Type.NUMBER, description: "Insurance contingency duration in days (default 17 or 7)" },
              leasedItemsDays: { type: Type.NUMBER, description: "Leased items review in days (default 7)" },
              copDays: { type: Type.NUMBER, description: "Sale of Buyer Property / COP duration in days if applicable" },
              representation: { type: Type.STRING, description: "Representation: 'Buyer', 'Seller', or 'Dual'" },
              leadSource: { type: Type.STRING, description: "Lead source e.g. Zillow, Referral, Open House, Sphere, Agent Referral" },
              status: { type: Type.STRING, description: "Initial status: 'Active', 'Pending', 'Closed', or 'Cancelled'" },
              notes: { type: Type.STRING, description: "Important key notes, special terms, or TC instructions" },
            },
          },
        },
      });

      if (response && response.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed in client fallback parser:`, err.message);
    }
  }

  throw lastError || new Error("Failed to parse document with Gemini AI.");
}
