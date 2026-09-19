import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
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
    console.warn("Could not initialize GoogleGenAI server client:", err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Multi-environment CORS middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Support large document/PDF uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      aiAvailable: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Global Default Email/SMS Templates Endpoints
  app.get("/api/templates/defaults", (_req, res) => {
    try {
      const filePath = path.join(process.cwd(), "src", "data", "defaultTemplates.json");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return res.json({ success: true, templates: JSON.parse(data) });
      }
      return res.json({ success: true, templates: [] });
    } catch (err: any) {
      console.error("Error reading default templates:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/templates/defaults", (req, res) => {
    try {
      const { templates, userEmail } = req.body;
      if (!Array.isArray(templates) || templates.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid templates array" });
      }

      const dirPath = path.join(process.cwd(), "src", "data");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const filePath = path.join(dirPath, "defaultTemplates.json");
      fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), "utf-8");
      console.log(`[Templates] Updated global default templates from ${userEmail || 'unknown'}. Total: ${templates.length}`);

      return res.json({ success: true, count: templates.length, message: "Default templates updated successfully" });
    } catch (err: any) {
      console.error("Error saving default templates:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

// Server-Side Pure PDF Text & Metadata Extractor (100% Offline / No AI tokens required)
async function extractServerPdfData(base64Data: string, fileName?: string, userRole?: string): Promise<any> {
  try {
    const { PDFDocument, PDFRawStream, PDFStream, decodePDFRawStream, PDFRef, PDFArray } = await import("pdf-lib");
    const buffer = Buffer.from(base64Data, "base64");
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, parseSpeed: 1000 });
    const textParts: string[] = [];

    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      try {
        const page = pdfDoc.getPage(i);
        const contents = page.node.Contents();
        const refs = contents instanceof PDFArray ? contents.asArray() : (contents ? [contents] : []);
        for (const ref of refs) {
          const stream = ref instanceof PDFRef ? pdfDoc.context.lookup(ref) : ref;
          if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
            try {
              const decoded = decodePDFRawStream(stream as any).decode();
              textParts.push(new TextDecoder("latin1").decode(decoded));
            } catch {}
          }
        }
      } catch {}
    }

    if (textParts.length === 0) {
      const objects = pdfDoc.context.enumerateIndirectObjects();
      for (const [, obj] of objects) {
        if (obj instanceof PDFRawStream || obj instanceof PDFStream) {
          try {
            const decoded = decodePDFRawStream(obj as any).decode();
            textParts.push(new TextDecoder("latin1").decode(decoded));
          } catch {}
        }
      }
    }

    const fullStreamText = textParts.join("\n");
    const lines: string[] = [];
    const tokenRegex = /(?:\[((?:[^\]\\]|\\.)*)\]\s*TJ)|(?:\(((?:[^)\\]|\\.)*)\)\s*(?:Tj|\x27|\x22))|(?:<([0-9A-Fa-f\s]+)>\s*(?:Tj|\x27|\x22))|(\bT\*|\bET|\bBT|\bTd|\bTD|\bTm|\bTj)/g;
    let match: RegExpExecArray | null;
    let currentLine: string[] = [];

    while ((match = tokenRegex.exec(fullStreamText)) !== null) {
      if (match[1] !== undefined) {
        const tjContent = match[1];
        const subRegex = /\(((?:[^)\\]|\\.)*)\)|<([0-9A-Fa-f\s]+)>/g;
        let sub: RegExpExecArray | null;
        let partStr = "";
        while ((sub = subRegex.exec(tjContent)) !== null) {
          if (sub[1] !== undefined) {
            partStr += sub[1]
              .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
              .replace(/\\([nrtbf()\\])/g, "$1");
          } else if (sub[2] !== undefined) {
            const clean = sub[2].replace(/\s+/g, "");
            for (let k = 0; k < clean.length; k += 2) {
              const b = parseInt(clean.substring(k, k + 2), 16);
              if (!isNaN(b) && b > 0) partStr += String.fromCharCode(b);
            }
          }
        }
        if (partStr.trim()) currentLine.push(partStr.trim());
      } else if (match[2] !== undefined) {
        const s = match[2]
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\([nrtbf()\\])/g, "$1");
        if (s.trim()) currentLine.push(s.trim());
      } else if (match[3] !== undefined) {
        const clean = match[3].replace(/\s+/g, "");
        let s = "";
        for (let k = 0; k < clean.length; k += 2) {
          const b = parseInt(clean.substring(k, k + 2), 16);
          if (!isNaN(b) && b > 0) s += String.fromCharCode(b);
        }
        if (s.trim()) currentLine.push(s.trim());
      } else if (match[4] !== undefined) {
        const op = match[4];
        if (op === "T*" || op === "ET" || op === "TD" || op === "Td") {
          if (currentLine.length > 0) {
            lines.push(currentLine.join(" ").trim());
            currentLine = [];
          }
        }
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(" ").trim());
    }

    try {
      const form = pdfDoc.getForm();
      for (const f of form.getFields()) {
        const name = f.getName();
        if ("getText" in f && typeof (f as any).getText === "function") {
          const val = (f as any).getText();
          if (val && val.trim()) lines.push(`${name}: ${val.trim()}`);
        }
      }
    } catch {}

    const text = lines.join("\n");
    const combined = `${text}\n${fileName || ""}`;

    const res: any = {
      representation: userRole || "Buyer",
      status: "Open",
    };

    // APN / Parcel #
    const apnMatch = combined.match(/(?:PARCEL\s*#|PARCEL\s*ID|PARCEL\s*NUMBER|APN\s*#|APN)[\s:#=-]*([0-9A-Za-z\-_/]{4,28})/i);
    if (apnMatch && !/^(page|form|paragraph|ca|none|pending)$/i.test(apnMatch[1])) {
      res.apn = apnMatch[1].trim();
    }

    // MLS ID
    const mlsMatch = combined.match(/(?:MLS\s*(?:#|ID|NUMBER|NO\.?)|LISTING\s*(?:#|ID|NUMBER|NO\.?))[\s:#=-]*([A-Za-z0-9\-_]{4,20})/i) || combined.match(/\b([A-Z]{2}\d{7,10})\b/);
    if (mlsMatch && !/^(page|form|paragraph|none|pending)$/i.test(mlsMatch[1])) {
      res.mlsId = mlsMatch[1].trim();
    }

    // Price
    const priceMatch = combined.match(/(?:LIST\s*PRICE|LP\b|SALE\s*PRICE|PURCHASE\s*PRICE|CONTRACT\s*PRICE)[^\d]*([\d,]+(?:\.\d{2})?)/i) || combined.match(/\$\s*([\d,]{5,}(?:\.\d{2})?)/);
    if (priceMatch) {
      const num = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (num >= 40000 && num <= 100000000) res.price = num;
    }

    // Address & City & Zip
    for (const l of lines) {
      const cleaned = l.replace(/^(?:Property\s*Address|Address|Property\s*Location)\s*[:#=-]\s*/i, "");
      const addrMatch = cleaned.match(/(?:Cross\s*Property\s*|360\s*Property\s*View\s*)?([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+?),\s*([A-Za-z\s.'-]+?),\s*(?:CA|California)\s*([0-9]{5})/i) ||
        cleaned.match(/([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+?),\s*([A-Za-z\s.'-]+?)\s+([0-9]{5})/i);
      if (addrMatch) {
        res.address = addrMatch[1].trim();
        res.city = addrMatch[2].trim();
        res.zipCode = addrMatch[3].trim();
        break;
      }
    }

    // Fallback address from filename e.g. "MLS 23301 Ridge Route .pdf"
    if (!res.address && fileName) {
      const fnClean = fileName.replace(/^(?:MLS\s*|RPA\s*)/i, "").replace(/\.pdf$/i, "").trim();
      const fnMatch = fnClean.match(/^([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+)/);
      if (fnMatch) {
        res.address = fnMatch[1].trim();
      }
    }

    // Listing Agent
    const laMatch = combined.match(/(?:LA\b|LISTING\s*AGENT|AGENT\s*NAME)\s*:\s*(?:\([^\)]+\)\s*)?([A-Za-z\s.'-]{3,35})/i);
    if (laMatch) {
      let name = laMatch[1].replace(/\b(?:LA|STATE|LIC|DRE|CalDRE|CELL|PHONE|EMAIL|LO)\b.*$/i, "").trim();
      name = name.replace(/^[\s,.:;()\-]+/, "").replace(/[\s,.:;()\-]+$/, "").trim();
      if (name.length >= 3 && !/^(la|cola|lo|dre|state|lic|phone|none)$/i.test(name)) {
        res.agentName = name;
        res.listingAgentName = name;
      }
    }

    // Listing Brokerage
    const loMatch = combined.match(/(?:LO\b|LISTING\s*OFFICE|BROKERAGE)\s*:\s*([A-Za-z0-9\s.,&'-]{3,45})/i);
    if (loMatch) {
      let brok = loMatch[1].replace(/\b(?:LO|STATE|LIC|DRE|CalDRE|PHONE|CELL)\b.*$/i, "").trim();
      if (brok.length >= 3) {
        res.cooperatingBrokerage = brok;
        res.listingBrokerage = brok;
      }
    }

    return res;
  } catch (e) {
    console.warn("Server PDF extraction error:", e);
    return null;
  }
}

  // AI RPA & Contract Scanner Endpoint
  app.post("/api/scan-rpa", async (req, res) => {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.warn("Could not parse string body:", e);
        }
      }

      const { fileData, mimeType, fileName } = body || {};

      if (!fileData || !mimeType) {
        return res.status(400).json({
          success: false,
          error: "Missing required file data or mimeType.",
        });
      }

      // Clean base64 string and extract actual MIME type
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

      const ai = getGenAI();
      if (!ai) {
        // Fallback to local server-side PDF text parser (Zero AI cost, instant)
        try {
          const serverExtracted = await extractServerPdfData(base64Clean, fileName, body?.userRole);
          if (serverExtracted && (serverExtracted.address || serverExtracted.price || serverExtracted.mlsId || serverExtracted.apn || serverExtracted.agentName)) {
            return res.json({
              success: true,
              data: serverExtracted,
              source: "server-pdf-engine",
            });
          }
        } catch (serverErr) {
          console.warn("Server PDF parser fallback notice:", serverErr);
        }

        return res.status(422).json({
          success: false,
          error:
            "GEMINI_API_KEY is not configured on the server. Please provide your GEMINI_API_KEY in the environment settings.",
        });
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

      const candidateModels = [
        "gemini-3.7-flash",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.1-pro-preview",
      ];

      let parsedData: any = null;
      let lastErrorMessage = "";
      let isQuotaError = false;

      for (const modelName of candidateModels) {
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
              },
            },
          });

          const responseText = response.text || "{}";
          parsedData = JSON.parse(responseText);

          if (parsedData && (parsedData.address || parsedData.price || parsedData.clientLastName || parsedData.escrowNumber || parsedData.agentName || parsedData.listingAgentName || parsedData.apn)) {
            return res.json({
              success: true,
              data: parsedData,
              source: "gemini",
              model: modelName,
            });
          }
        } catch (err: any) {
          lastErrorMessage = err?.message || String(err);
          if (
            lastErrorMessage.includes("prepayment credits are depleted") ||
            lastErrorMessage.includes("RESOURCE_EXHAUSTED") ||
            lastErrorMessage.includes("429")
          ) {
            isQuotaError = true;
          }
          console.warn(`Model ${modelName} encountered error:`, lastErrorMessage);
        }
      }

      // If Gemini models encountered an error or exhausted quota, run offline server-side PDF extraction fallback
      try {
        const serverExtracted = await extractServerPdfData(base64Clean, fileName, body?.userRole);
        if (serverExtracted && (serverExtracted.address || serverExtracted.price || serverExtracted.mlsId || serverExtracted.apn || serverExtracted.agentName)) {
          return res.json({
            success: true,
            data: serverExtracted,
            source: "server-pdf-engine",
          });
        }
      } catch (serverErr) {
        console.warn("Server PDF fallback scan notice:", serverErr);
      }

      let userFriendlyError = "Could not extract valid transaction fields from the document.";
      if (isQuotaError) {
        userFriendlyError =
          "Google AI Studio quota / prepayment credits depleted for this API key. Please check your project billing or generate a new Gemini API Key at https://aistudio.google.com/app/apikey.";
      } else if (lastErrorMessage) {
        userFriendlyError = `Document analysis error: ${lastErrorMessage}`;
      }

      return res.status(422).json({
        success: false,
        error: userFriendlyError,
      });
    } catch (error: any) {
      console.error("Error in /api/scan-rpa handler:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to scan document.",
      });
    }
  });

  // Vite middleware for development vs static build in production
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
