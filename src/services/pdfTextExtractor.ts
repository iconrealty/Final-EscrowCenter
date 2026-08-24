export interface ExtractedRpaData {
  escrowNumber?: string;
  apn?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientEmail?: string;
  client2FirstName?: string;
  client2LastName?: string;
  seller1Name?: string;
  seller2Name?: string;
  buyer1Name?: string;
  buyer2Name?: string;
  buyerAgentName?: string;
  buyerAgentPhone?: string;
  buyerAgentEmail?: string;
  buyerBrokerage?: string;
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingBrokerage?: string;
  escrowCompany?: string;
  escrowOfficer?: string;
  escrowPhone?: string;
  escrowEmail?: string;
  titleCompany?: string;
  price?: number;
  initialDeposit?: number;
  loanAmount?: number;
  loanType?: string;
  acceptanceDate?: string;
  coeDate?: string;
  coeDays?: number;
  representation?: 'Buyer' | 'Seller' | 'Dual';
  leadSource?: string;
  status?: string;
  notes?: string;
  loanContingencyDays?: number;
  appraisalContingencyDays?: number;
  inspectionContingencyDays?: number;
  sellerDisclosureDays?: number;
  titleReportDays?: number;
  hoaDocDays?: number;
  insuranceDays?: number;
  leasedItemsDays?: number;
  copDays?: number;
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

export async function extractPdfBufferText(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfParseModule: any = await import("pdf-parse");
    const fn = pdfParseModule.default || pdfParseModule;
    if (typeof fn === "function") {
      const data = await fn(pdfBuffer);
      return data?.text || "";
    }
    if (pdfParseModule.PDFParse) {
      const instance = new pdfParseModule.PDFParse(pdfBuffer);
      const data = await instance.getText();
      return data || "";
    }
    return "";
  } catch (err) {
    console.warn("Could not extract digital text from PDF buffer:", err);
    return "";
  }
}

export function parseRpaTextContent(text: string): ExtractedRpaData {
  const result: ExtractedRpaData = {
    representation: 'Buyer',
    status: 'Active',
    leadSource: 'Self',
    notes: 'Parsed from RPA contract document',
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  // 1. Purchase Price (e.g. $850,000, 3A. Purchase Price $..., or Price: $...)
  const priceMatches = [
    /3\s*A\b[^\$\n\r]*\$\s*([\d,]+(?:\.\d{2})?)/i,
    /Purchase\s+Price[^\$\n\r]*\$\s*([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]{6,10})/
  ];
  for (const regex of priceMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (parsed >= 10000 && parsed <= 500000000) {
        result.price = parsed;
        break;
      }
    }
  }

  // 2. Initial Deposit (3D(1) Initial Deposit $...)
  const depositMatches = [
    /3\s*D\s*\(?1\)?\s*Initial\s+Deposit[^\$\n\r]*\$\s*([\d,]+(?:\.\d{2})?)/i,
    /Initial\s+Deposit[^\$\n\r]*\$\s*([\d,]+(?:\.\d{2})?)/i,
    /EMD[^\$\n\r]*\$\s*([\d,]+(?:\.\d{2})?)/i
  ];
  for (const regex of depositMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (parsed > 0) {
        result.initialDeposit = parsed;
        break;
      }
    }
  }

  // 3. Loan Amount & Type (3E First Loan $...)
  const loanMatch = text.match(/3\s*E\b[^\$\n\r]*\$\s*([\d,]+)/i) || text.match(/First\s+Loan[^\$\n\r]*\$\s*([\d,]+)/i);
  if (loanMatch && loanMatch[1]) {
    result.loanAmount = parseFloat(loanMatch[1].replace(/,/g, ''));
  }
  if (/FHA\b/i.test(text)) result.loanType = 'FHA';
  else if (/VA\b/i.test(text)) result.loanType = 'VA';
  else if (/Conventional/i.test(text)) result.loanType = 'Conventional';
  else if (/Cash/i.test(text) || result.loanAmount === 0) result.loanType = 'Cash';

  // 4. Property Address, City, Zip, APN
  // Example in RPA: "REAL PROPERTY ... situated in [City], [County], California, [Zip], Assessor's Parcel No. [APN], addressed as [Street]"
  const apnMatch = text.match(/Assessor(?:'s)?\s+Parcel\s+(?:No\.?|Number|#)?\s*:?\s*([A-Za-z0-9\-\s]{5,20})/i) ||
                   text.match(/APN\s*#?\s*:?\s*([A-Za-z0-9\-\s]{5,20})/i);
  if (apnMatch && apnMatch[1]) {
    result.apn = apnMatch[1].trim();
  }

  const addrMatches = [
    /addressed\s+as\s*[:\-]?\s*([0-9]+[A-Za-z0-9\s,\.\#\-]+?)(?:,\s*California|\s*CA\b|\n|\r|Assessor)/i,
    /Property\s+Address\s*[:\-]?\s*([0-9]+[A-Za-z0-9\s,\.\#\-]+?)(?:,\s*California|\s*CA\b|\n|\r|APN)/i,
    /([0-9]+\s+[A-Za-z0-9\s\.\#\-]+(?:Street|St|Avenue|Ave|Drive|Dr|Road|Rd|Boulevard|Blvd|Lane|Ln|Court|Ct|Way|Place|Pl|Circle|Cir))/i
  ];
  for (const regex of addrMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanAddr = match[1].replace(/[\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (cleanAddr.length > 5 && cleanAddr.length < 80) {
        result.address = cleanAddr;
        break;
      }
    }
  }

  const zipMatch = text.match(/\b(9\d{4}(?:-\d{4})?)\b/);
  if (zipMatch && zipMatch[1]) {
    result.zipCode = zipMatch[1].substring(0, 5);
  }

  const cityMatches = [
    /situated\s+in\s+([A-Za-z\s]+?)(?:,\s*California|\s*CA\b|,\s*County)/i,
    /City\s+of\s+([A-Za-z\s]+?)(?:,\s*California|\s*CA\b)/i
  ];
  for (const regex of cityMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanCity = match[1].trim();
      if (cleanCity.length > 2 && cleanCity.length < 35) {
        result.city = cleanCity;
        break;
      }
    }
  }

  // 5. Close of Escrow (COE) Date or Days
  const coeDaysMatch = text.match(/3\s*B\b.*?(\d{1,3})\s*(?:Calendar\s+)?Days\s+after\s+Acceptance/i) ||
                       text.match(/Close\s+of\s+Escrow.*?(\d{1,3})\s*Days/i);
  if (coeDaysMatch && coeDaysMatch[1]) {
    result.coeDays = parseInt(coeDaysMatch[1], 10);
  }

  // Date match for COE
  const datePattern = /\b(202[4-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/;
  const coeDateMatch = text.match(/3\s*B\b.*?on\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i) ||
                       text.match(/Close\s+of\s+Escrow.*?([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i);
  if (coeDateMatch && coeDateMatch[1]) {
    const parts = coeDateMatch[1].split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      result.coeDate = `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }

  // 6. Buyer & Seller Names
  const buyerMatch = text.match(/1\s*A\b.*?OFFER\s+FROM\s*[:\-]?\s*([A-Za-z\s,\.\&]+?)(?:\s*\("Buyer"\)|\n|\r|1\s*B)/i) ||
                     text.match(/Buyer\s*\(?s?\)?\s*[:\-]?\s*([A-Za-z\s,\.\&]+?)(?:\n|\r|\("Buyer"\))/i);
  if (buyerMatch && buyerMatch[1]) {
    const rawBuyers = buyerMatch[1].replace(/[\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const splitBuyers = rawBuyers.split(/(?:,|\band\b|&)/i).map(s => s.trim()).filter(Boolean);
    if (splitBuyers[0]) {
      result.buyer1Name = splitBuyers[0];
      const nameParts = splitBuyers[0].split(/\s+/);
      if (nameParts.length > 1) {
        result.clientFirstName = nameParts[0];
        result.clientLastName = nameParts.slice(1).join(' ');
      } else {
        result.clientLastName = splitBuyers[0];
      }
    }
    if (splitBuyers[1]) {
      result.buyer2Name = splitBuyers[1];
      const nameParts2 = splitBuyers[1].split(/\s+/);
      if (nameParts2.length > 1) {
        result.client2FirstName = nameParts2[0];
        result.client2LastName = nameParts2.slice(1).join(' ');
      }
    }
  }

  const sellerMatch = text.match(/Seller\s*\(?s?\)?\s*[:\-]?\s*([A-Za-z\s,\.\&]+?)(?:\s*\("Seller"\)|\n|\r|Property)/i);
  if (sellerMatch && sellerMatch[1]) {
    const rawSellers = sellerMatch[1].replace(/[\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const splitSellers = rawSellers.split(/(?:,|\band\b|&)/i).map(s => s.trim()).filter(Boolean);
    if (splitSellers[0]) result.seller1Name = splitSellers[0];
    if (splitSellers[1]) result.seller2Name = splitSellers[1];
  }

  // 7. Contingencies (3L grid)
  const l1 = text.match(/Loan\s*\(1\)[^\d]*(\d{1,2})/i);
  const l2 = text.match(/Appraisal\s*\(2\)[^\d]*(\d{1,2})/i);
  const l3 = text.match(/Investigation\s*(?:of\s+Property)?\s*\(3\)[^\d]*(\d{1,2})/i);
  const l4 = text.match(/Property\s+Insurance\s*\(4\)[^\d]*(\d{1,2})/i);
  const l5 = text.match(/Seller\s+Disclosures\s*\(5\)[^\d]*(\d{1,2})/i);
  const l6 = text.match(/Preliminary\s+Report\s*\(6\)[^\d]*(\d{1,2})/i);
  const l7 = text.match(/Common\s+Interest\s*\(7\)[^\d]*(\d{1,2})/i);
  const l8 = text.match(/Leased\s+Items\s*\(8\)[^\d]*(\d{1,2})/i);
  const l9 = text.match(/Sale\s+of\s+Buyer\s+Property\s*\(9\)[^\d]*(\d{1,2})/i);

  result.loanContingencyDays = l1 ? parseInt(l1[1], 10) : 14;
  result.appraisalContingencyDays = l2 ? parseInt(l2[1], 10) : 17;
  result.inspectionContingencyDays = l3 ? parseInt(l3[1], 10) : 17;
  result.insuranceDays = l4 ? parseInt(l4[1], 10) : 17;
  result.sellerDisclosureDays = l5 ? parseInt(l5[1], 10) : 7;
  result.titleReportDays = l6 ? parseInt(l6[1], 10) : 7;
  result.hoaDocDays = l7 ? parseInt(l7[1], 10) : 7;
  result.leasedItemsDays = l8 ? parseInt(l8[1], 10) : 7;
  result.copDays = l9 ? parseInt(l9[1], 10) : 17;

  result.contingencyDays = {
    L1: result.loanContingencyDays,
    L2: result.appraisalContingencyDays,
    L3: result.inspectionContingencyDays,
    L4: result.insuranceDays,
    L5: result.sellerDisclosureDays,
    L6: result.titleReportDays,
    L7: result.hoaDocDays,
    L8: result.leasedItemsDays,
    L9: result.copDays,
  };

  // 8. Escrow & Title info
  const escrowMatch = text.match(/Escrow\s+(?:Holder|Company)\s*[:\-]?\s*([A-Za-z0-9\s,\.\&]+?)(?:,\s*Escrow\s+Officer|\n|\r|Email)/i);
  if (escrowMatch && escrowMatch[1]) {
    result.escrowCompany = escrowMatch[1].trim();
  }
  const escrowOfficerMatch = text.match(/Escrow\s+Officer\s*[:\-]?\s*([A-Za-z\s\.]+?)(?:\n|\r|Email|Phone)/i);
  if (escrowOfficerMatch && escrowOfficerMatch[1]) {
    result.escrowOfficer = escrowOfficerMatch[1].trim();
  }
  const escrowNumMatch = text.match(/Escrow\s+(?:#|No\.?|Number|File\s+#?)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
  if (escrowNumMatch && escrowNumMatch[1]) {
    result.escrowNumber = escrowNumMatch[1].trim();
  }

  // 9. Agent / Brokerage
  const buyerBrokerMatch = text.match(/Buyer'?s\s+Brokerage\s+Firm\s*[:\-]?\s*([A-Za-z0-9\s,\.\&]+?)(?:\s+DRE|\n|\r|Buyer'?s\s+Agent)/i);
  if (buyerBrokerMatch && buyerBrokerMatch[1]) {
    result.buyerBrokerage = buyerBrokerMatch[1].trim();
  }
  const buyerAgentMatch = text.match(/Buyer'?s\s+Agent\s*[:\-]?\s*([A-Za-z\s\.]+?)(?:\s+DRE|\n|\r|Email|Phone)/i);
  if (buyerAgentMatch && buyerAgentMatch[1]) {
    result.buyerAgentName = buyerAgentMatch[1].trim();
  }
  const listingBrokerMatch = text.match(/Listing\s+Brokerage\s+Firm\s*[:\-]?\s*([A-Za-z0-9\s,\.\&]+?)(?:\s+DRE|\n|\r|Listing\s+Agent)/i);
  if (listingBrokerMatch && listingBrokerMatch[1]) {
    result.listingBrokerage = listingBrokerMatch[1].trim();
  }
  const listingAgentMatch = text.match(/Listing\s+Agent\s*[:\-]?\s*([A-Za-z\s\.]+?)(?:\s+DRE|\n|\r|Email|Phone)/i);
  if (listingAgentMatch && listingAgentMatch[1]) {
    result.listingAgentName = listingAgentMatch[1].trim();
  }

  return result;
}
