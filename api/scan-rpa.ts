import { GoogleGenAI, Type } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      return null;
    }
    if (!genAIClient) {
      genAIClient = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return genAIClient;
  } catch (err) {
    console.warn("Could not initialize GoogleGenAI in serverless function:", err);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileData, mimeType, fileName } = req.body || {};

    if (!fileData || !mimeType) {
      return res.status(400).json({
        success: false,
        error: "Missing required file data or mimeType.",
      });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "GEMINI_API_KEY is not configured on the server.",
      });
    }

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
You are an expert California Real Estate Transaction Coordinator (TC) and Escrow Officer specializing in California Residential Purchase Agreements (C.A.R. Form RPA, RPA-CA), Addenda, and MLS Listing Sheets.
Analyze the provided document (${fileName || "Real Estate Contract"}) and extract all transaction, property, client, agent, escrow, title, financing, and contingency timeline details.

CRITICAL FIELD EXTRACTION RULES:
1. PARAGRAPH 3 GRID (Pages 1-3 of RPA-CA):
   - 3A: Purchase Price (numeric, e.g. 850000)
   - 3B: Close of Escrow (COE) Date (formatted YYYY-MM-DD) or number of days from acceptance (coeDays, e.g. 30)
   - 3D(1): Initial Deposit / EMD in dollars (numeric)
   - 3E: Loan Amount, loan type (Conventional, FHA, VA, Cash)
   - 3L: Contingency timelines in days:
        * Loan (L1): default 14 or specified days
        * Appraisal (L2): default 17 (or 10) or specified days
        * Physical Investigation / Inspection (L3): default 17 (or 7) or specified days
        * Insurance (L4): default 17 (or 7) or specified days
        * Seller Disclosures (L5): default 7 or specified days
        * Title Report (L6): default 7 or specified days
        * Common Interest / HOA (L7): default 7 or specified days
        * Leased Items (L8): default 7 or specified days
        * Sale of Buyer's Property / COP (L9): default 17 or specified days
   - Document Header / Grid:
        * Street Address (e.g. 1206 Louise St) -> 'address' (WITHOUT city or zip)
        * City (e.g. Santa Ana) -> 'city'
        * Zip Code (e.g. 92703) -> 'zipCode'
        * APN (Assessor's Parcel Number, e.g. 402-192-14) -> 'apn'
        * Buyer Names -> clientFirstName, clientLastName (and client2FirstName, client2LastName for second buyer)
        * Seller Names -> seller1Name, seller2Name

2. REAL ESTATE BROKERS & ESCROW CONFIRMATION (Pages 15-16 of RPA):
   - Buyer's Brokerage & Agent Name, Email, Phone, DRE License Numbers
   - Listing Brokerage & Agent Name, Email, Phone, DRE License Numbers
   - Escrow Holder: Escrow Company Name, Escrow Officer, Escrow File #, Email, Phone
   - Title Company / Officer contact details if specified
   - Mutual Acceptance Date (formatted YYYY-MM-DD)

3. COMMISSIONS & REPRESENTATION:
   - Identify representation: 'Buyer', 'Seller', or 'Dual'
   - Commission percentage (e.g. 2.5) and calculate net commission in dollars if price is known

4. MLS SHEETS / LISTINGS:
   - Extract Address, City, Zip, APN, List Price, Listing Agent/Brokerage, Buyer Broker Commission (BAC %)

Output format: Return all dates formatted as YYYY-MM-DD. Return clean strings and numbers matching the schema.
`;

    let parsedData: any = null;
    let lastErrorMessage = "";

    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];

    for (const modelName of candidateModels) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const parts: any[] = [];
          if (actualMimeType.startsWith("text/")) {
            let textContent = Buffer.from(base64Clean, "base64").toString("utf-8");
            if (!textContent || textContent.trim().length === 0) {
              textContent = base64Clean;
            }
            parts.push({ text: `Document content:\n${textContent}\n\n${promptText}` });
          } else {
            parts.push({
              inlineData: {
                data: base64Clean,
                mimeType: actualMimeType,
              },
            });
            parts.push({ text: promptText });
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts,
            },
            config: {
              systemInstruction:
                "You are an expert California Real Estate Transaction Coordinator and RPA parser that outputs strict JSON matching the schema.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  escrowNumber: { type: Type.STRING, description: "Escrow file number if present" },
                  apn: { type: Type.STRING, description: "Assessor's Parcel Number (APN)" },
                  address: { type: Type.STRING, description: "Property street address without city/zip" },
                  city: { type: Type.STRING, description: "City name" },
                  zipCode: { type: Type.STRING, description: "5-digit zip code" },
                  clientFirstName: { type: Type.STRING, description: "First name of primary buyer or client" },
                  clientLastName: { type: Type.STRING, description: "Last name of primary buyer or client" },
                  clientPhone: { type: Type.STRING, description: "Phone number of client" },
                  clientEmail: { type: Type.STRING, description: "Email address of client" },
                  clientBirthday: { type: Type.STRING, description: "Client birthday YYYY-MM-DD" },
                  client2FirstName: { type: Type.STRING, description: "First name of co-buyer or second client" },
                  client2LastName: { type: Type.STRING, description: "Last name of co-buyer or second client" },
                  client2Phone: { type: Type.STRING, description: "Phone of second client" },
                  client2Email: { type: Type.STRING, description: "Email of second client" },
                  seller1Name: { type: Type.STRING, description: "Seller 1 full name" },
                  seller2Name: { type: Type.STRING, description: "Seller 2 full name" },
                  buyer1Name: { type: Type.STRING, description: "Buyer 1 full name" },
                  buyer2Name: { type: Type.STRING, description: "Buyer 2 full name" },
                  collaborator: { type: Type.STRING, description: "Co-agent or collaborator" },
                  buyerAgentName: { type: Type.STRING, description: "Buyer's agent full name" },
                  buyerAgentPhone: { type: Type.STRING, description: "Buyer's agent phone" },
                  buyerAgentEmail: { type: Type.STRING, description: "Buyer's agent email" },
                  buyerBrokerage: { type: Type.STRING, description: "Buyer's brokerage firm name" },
                  buyerAgentDRE: { type: Type.STRING, description: "Buyer's agent DRE license number" },
                  buyerBrokerDRE: { type: Type.STRING, description: "Buyer's brokerage DRE license number" },
                  listingAgentName: { type: Type.STRING, description: "Listing agent full name" },
                  listingAgentPhone: { type: Type.STRING, description: "Listing agent phone" },
                  listingAgentEmail: { type: Type.STRING, description: "Listing agent email" },
                  listingBrokerage: { type: Type.STRING, description: "Listing brokerage firm name" },
                  listingAgentDRE: { type: Type.STRING, description: "Listing agent DRE license number" },
                  listingBrokerDRE: { type: Type.STRING, description: "Listing brokerage DRE license number" },
                  agentName: { type: Type.STRING, description: "The other party agent name" },
                  agentPhone: { type: Type.STRING, description: "The other party agent phone" },
                  agentEmail: { type: Type.STRING, description: "The other party agent email" },
                  cooperatingBrokerage: { type: Type.STRING, description: "The other party brokerage name" },
                  escrowCompany: { type: Type.STRING, description: "Escrow company name" },
                  escrowOfficer: { type: Type.STRING, description: "Escrow officer full name" },
                  escrowPhone: { type: Type.STRING, description: "Escrow officer phone number" },
                  escrowEmail: { type: Type.STRING, description: "Escrow officer email" },
                  titleCompany: { type: Type.STRING, description: "Title company name" },
                  titleOfficer: { type: Type.STRING, description: "Title officer name" },
                  titlePhone: { type: Type.STRING, description: "Title officer phone" },
                  titleEmail: { type: Type.STRING, description: "Title officer email" },
                  lenderName: { type: Type.STRING, description: "Lender or Loan Officer name / company" },
                  lenderPhone: { type: Type.STRING, description: "Lender phone" },
                  lenderEmail: { type: Type.STRING, description: "Lender email" },
                  loanType: { type: Type.STRING, description: "Conventional, FHA, VA, or Cash" },
                  loanAmount: { type: Type.NUMBER, description: "Loan amount in dollars" },
                  initialDeposit: { type: Type.NUMBER, description: "Initial deposit / EMD in dollars" },
                  price: { type: Type.NUMBER, description: "Purchase / Sale price in dollars" },
                  commissionPercent: { type: Type.NUMBER, description: "Commission percentage (e.g. 2.5)" },
                  netCommission: { type: Type.NUMBER, description: "Estimated net commission in dollars" },
                  acceptanceDate: { type: Type.STRING, description: "Mutual acceptance date in YYYY-MM-DD format" },
                  coeDays: { type: Type.INTEGER, description: "Number of days for Close of Escrow from 3B" },
                  coeDate: { type: Type.STRING, description: "Close of Escrow (COE) date in YYYY-MM-DD format" },
                  contingencyStartDate: { type: Type.STRING, description: "Contingency start date in YYYY-MM-DD format" },
                  loanContingencyDays: { type: Type.INTEGER, description: "Loan contingency days count" },
                  appraisalContingencyDays: { type: Type.INTEGER, description: "Appraisal contingency days count" },
                  inspectionContingencyDays: { type: Type.INTEGER, description: "Inspection contingency days count" },
                  sellerDisclosureDays: { type: Type.INTEGER, description: "Seller disclosure days count" },
                  titleReportDays: { type: Type.INTEGER, description: "Title report days count" },
                  hoaDocDays: { type: Type.INTEGER, description: "HOA doc review days count" },
                  insuranceDays: { type: Type.INTEGER, description: "Insurance contingency days count" },
                  leasedItemsDays: { type: Type.INTEGER, description: "Leased items days count" },
                  copDays: { type: Type.INTEGER, description: "COP days count" },
                  representation: { type: Type.STRING, description: "Buyer, Seller, or Dual" },
                  leadSource: { type: Type.STRING, description: "Lead source if identified" },
                  status: { type: Type.STRING, description: "Open, Closed, or Cancelled" },
                  notes: { type: Type.STRING, description: "Summary notes on financing, terms, etc." },
                  contingencyDays: {
                    type: Type.OBJECT,
                    description: "Contingency day counts for California contract timeline",
                    properties: {
                      L1: { type: Type.INTEGER, description: "Loan contingency days" },
                      L2: { type: Type.INTEGER, description: "Appraisal contingency days" },
                      L3: { type: Type.INTEGER, description: "Inspection contingency days" },
                      L4: { type: Type.INTEGER, description: "Insurance contingency days" },
                      L5: { type: Type.INTEGER, description: "Seller Disclosures contingency days" },
                      L6: { type: Type.INTEGER, description: "Title report contingency days" },
                      L7: { type: Type.INTEGER, description: "HOA contingency days" },
                      L8: { type: Type.INTEGER, description: "Leased items contingency days" },
                      L9: { type: Type.INTEGER, description: "COP contingency days" },
                    },
                  },
                },
                required: ["address"],
              },
            },
          });

          const responseText = response.text || "{}";
          parsedData = JSON.parse(responseText);

          if (
            parsedData &&
            (parsedData.address || parsedData.price || parsedData.clientLastName || parsedData.escrowNumber)
          ) {
            break;
          }
        } catch (err: any) {
          lastErrorMessage = err?.message || String(err);
          console.warn(`Serverless model ${modelName} attempt ${attempts} error:`, lastErrorMessage);

          if (lastErrorMessage.includes("503") || lastErrorMessage.includes("429") || lastErrorMessage.includes("high demand")) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
          } else {
            break;
          }
        }
      }

      if (parsedData && (parsedData.address || parsedData.price || parsedData.clientLastName || parsedData.escrowNumber)) {
        break;
      }
    }

    if (parsedData && (parsedData.address || parsedData.price || parsedData.clientLastName || parsedData.escrowNumber)) {
      return res.status(200).json({
        success: true,
        data: parsedData,
      });
    }

    return res.status(422).json({
      success: false,
      error:
        lastErrorMessage
          ? `Gemini scanning error: ${lastErrorMessage}`
          : "Could not extract valid transaction fields from document.",
    });
  } catch (error: any) {
    console.error("Error scanning document in API handler:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to scan document.",
    });
  }
}
