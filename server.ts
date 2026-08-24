import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { extractTextFromPdfBase64, parseRpaText } from "./src/services/localRpaParser";

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
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return genAIClient;
  } catch (err) {
    console.warn("Could not initialize GoogleGenAI server client:", err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS middleware for multi-environment & deployment compatibility
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Increase payload limit for PDF base64 payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI RPA & Document Scanner Endpoint
  app.post("/api/scan-rpa", async (req, res) => {
    try {
      const { fileData, mimeType, fileName } = req.body;

      if (!fileData || !mimeType) {
        return res.status(400).json({ 
          error: "Missing required file data or mimeType." 
        });
      }

      const ai = getGenAI();

      // Clean base64 string and extract actual MIME type if data URL prefix was sent
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

      let parsedData: any = null;

      if (ai) {
        // High-availability valid Gemini models
        const candidateModels = [
          "gemini-3.7-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
        ];

        for (const modelName of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Clean,
                      mimeType: actualMimeType,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
              config: {
                systemInstruction: "You are an expert California Real Estate Transaction Coordinator and RPA parser that outputs strict JSON matching the schema.",
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
                    agentName: { type: Type.STRING, description: "The cooperating / other party agent name" },
                    agentPhone: { type: Type.STRING, description: "The cooperating / other party agent phone" },
                    agentEmail: { type: Type.STRING, description: "The cooperating / other party agent email" },
                    cooperatingBrokerage: { type: Type.STRING, description: "The cooperating / other party brokerage name" },
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
                    price: { type: Type.NUMBER, description: "Purchase / Sale price in dollars" },
                    commissionPercent: { type: Type.NUMBER, description: "Commission percentage (e.g. 2.5)" },
                    netCommission: { type: Type.NUMBER, description: "Estimated or stated net commission in dollars" },
                    acceptanceDate: { type: Type.STRING, description: "Mutual acceptance date in YYYY-MM-DD format" },
                    coeDays: { type: Type.INTEGER, description: "Number of days for Close of Escrow from 3B (e.g. 30, 21, 45)" },
                    coeDate: { type: Type.STRING, description: "Close of Escrow (COE) date in YYYY-MM-DD format" },
                    contingencyStartDate: { type: Type.STRING, description: "Contingency start date in YYYY-MM-DD format" },
                    representation: { type: Type.STRING, description: "Buyer, Seller, or Dual" },
                    leadSource: { type: Type.STRING, description: "Lead source if identified, e.g. Zillow, Self, Team Lead" },
                    status: { type: Type.STRING, description: "Open, Closed, or Cancelled" },
                    notes: { type: Type.STRING, description: "Summary notes on financing, EMD deposit, special terms, etc." },
                    contingencyDays: {
                      type: Type.OBJECT,
                      description: "Contingency day counts for California contract timeline",
                      properties: {
                        L1: { type: Type.INTEGER, description: "Loan contingency days (e.g. 14)" },
                        L2: { type: Type.INTEGER, description: "Appraisal contingency days (e.g. 17 or 10)" },
                        L3: { type: Type.INTEGER, description: "Investigation / Inspection contingency days (e.g. 17 or 7)" },
                        L4: { type: Type.INTEGER, description: "Insurance contingency days (e.g. 17 or 7)" },
                        L5: { type: Type.INTEGER, description: "Seller Disclosures contingency days (e.g. 7)" },
                        L6: { type: Type.INTEGER, description: "Title report contingency days (e.g. 7)" },
                        L7: { type: Type.INTEGER, description: "Common Interest / HOA contingency days (e.g. 7)" },
                        L8: { type: Type.INTEGER, description: "Leased items contingency days (e.g. 7)" },
                        L9: { type: Type.INTEGER, description: "Sale of Buyer's Property / COP contingency days (e.g. 17)" },
                      },
                    },
                  },
                  required: ["address"],
                },
              },
            });

            const responseText = response.text || "{}";
            parsedData = JSON.parse(responseText);
            if (parsedData && (parsedData.address || parsedData.price || parsedData.clientLastName || parsedData.escrowNumber)) {
              break; // Success! Exit model loop
            }
          } catch (err: any) {
            console.warn(`Model ${modelName} failed, trying next:`, err?.message || err);
            continue;
          }
        }
      }

      // If AI succeeded in parsing
      if (parsedData && (parsedData.address || parsedData.price || parsedData.clientLastName || parsedData.escrowNumber)) {
        return res.json({
          success: true,
          data: parsedData,
        });
      }

      // If text/plain document or PDF text is readable, try local parse as secondary fallback only if valid address found
      if (!parsedData || !parsedData.address) {
        const rawText = actualMimeType === "application/pdf"
          ? extractTextFromPdfBase64(base64Clean)
          : base64Clean;
        const localData = parseRpaText(rawText, fileName);
        if (localData && (localData.address || localData.price)) {
          parsedData = localData;
        }
      }

      if (parsedData && (parsedData.address || parsedData.price || parsedData.clientLastName)) {
        return res.json({
          success: true,
          data: parsedData,
        });
      }

      return res.status(422).json({
        success: false,
        error: "Could not accurately parse real estate details from this document. Please verify the document format or input the details directly.",
      });
    } catch (error: any) {
      console.error("Error scanning document with Gemini:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to scan document with Gemini AI.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SimpL. Escrow Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
