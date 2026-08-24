import { GoogleGenAI, Type } from "@google/genai";
import { extractTextFromPdfBase64, parseRpaText } from "./localRpaParser";

let aiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI | null {
  try {
    // In browser/client environment, check various env bindings safely
    const apiKey = 
      (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY);

    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      return null;
    }

    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiInstance;
  } catch (error) {
    console.warn("Client GoogleGenAI initialization skipped:", error);
    return null;
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
  let base64Clean = fileData || "";
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

  // 1. Try Gemini API if an AI instance / API key is available
  const ai = getAi();
  if (ai) {
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
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];

    for (const modelName of candidateModels) {
      try {
        const dataPart =
          actualMimeType === "text/plain"
            ? { text: base64Clean }
            : { inlineData: { mimeType: actualMimeType, data: base64Clean } };

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [dataPart, { text: promptText }],
            },
          ],
          config: {
            systemInstruction:
              "You are a fast, accurate Real Estate Document and California RPA contract parser that outputs strict JSON matching the schema.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                escrowNumber: { type: Type.STRING },
                apn: { type: Type.STRING },
                address: { type: Type.STRING },
                city: { type: Type.STRING },
                zipCode: { type: Type.STRING },
                clientFirstName: { type: Type.STRING },
                clientLastName: { type: Type.STRING },
                clientPhone: { type: Type.STRING },
                clientEmail: { type: Type.STRING },
                clientBirthday: { type: Type.STRING },
                client2FirstName: { type: Type.STRING },
                client2LastName: { type: Type.STRING },
                client2Phone: { type: Type.STRING },
                client2Email: { type: Type.STRING },
                seller1Name: { type: Type.STRING },
                seller2Name: { type: Type.STRING },
                buyer1Name: { type: Type.STRING },
                buyer2Name: { type: Type.STRING },
                collaborator: { type: Type.STRING },
                agentName: { type: Type.STRING },
                agentPhone: { type: Type.STRING },
                agentEmail: { type: Type.STRING },
                cooperatingBrokerage: { type: Type.STRING },
                listingAgentName: { type: Type.STRING },
                listingAgentPhone: { type: Type.STRING },
                listingAgentEmail: { type: Type.STRING },
                listingBrokerage: { type: Type.STRING },
                buyerAgentName: { type: Type.STRING },
                buyerAgentPhone: { type: Type.STRING },
                buyerAgentEmail: { type: Type.STRING },
                buyerBrokerage: { type: Type.STRING },
                lenderName: { type: Type.STRING },
                lenderPhone: { type: Type.STRING },
                lenderEmail: { type: Type.STRING },
                loanType: { type: Type.STRING },
                loanAmount: { type: Type.NUMBER },
                initialDeposit: { type: Type.NUMBER },
                escrowCompany: { type: Type.STRING },
                escrowOfficer: { type: Type.STRING },
                escrowPhone: { type: Type.STRING },
                escrowEmail: { type: Type.STRING },
                titleCompany: { type: Type.STRING },
                titleOfficer: { type: Type.STRING },
                titlePhone: { type: Type.STRING },
                titleEmail: { type: Type.STRING },
                price: { type: Type.NUMBER },
                commissionPercent: { type: Type.NUMBER },
                netCommission: { type: Type.NUMBER },
                acceptanceDate: { type: Type.STRING },
                coeDate: { type: Type.STRING },
                coeDays: { type: Type.NUMBER },
                contingencyStartDate: { type: Type.STRING },
                loanContingencyDays: { type: Type.NUMBER },
                appraisalContingencyDays: { type: Type.NUMBER },
                inspectionContingencyDays: { type: Type.NUMBER },
                sellerDisclosureDays: { type: Type.NUMBER },
                titleReportDays: { type: Type.NUMBER },
                hoaDocDays: { type: Type.NUMBER },
                insuranceDays: { type: Type.NUMBER },
                leasedItemsDays: { type: Type.NUMBER },
                copDays: { type: Type.NUMBER },
                representation: { type: Type.STRING },
                leadSource: { type: Type.STRING },
                status: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
            },
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed && (parsed.address || parsed.price || parsed.clientLastName || parsed.escrowNumber)) {
            return parsed;
          }
        }
      } catch (_modelErr) {
        // High demand spike or model unavailability - smoothly cascade to next model
        continue;
      }
    }
  }

  // 2. Seamless Local Parser Fallback (Requires NO external API key)
  console.log("Parsing California RPA using built-in high-performance local parser...");
  const rawText = actualMimeType === "application/pdf"
    ? extractTextFromPdfBase64(base64Clean)
    : base64Clean;

  const localParsed = parseRpaText(rawText, fileName);
  return localParsed;
}
