import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  try {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      
      console.log("Initializing AI engine...");
      if (!apiKey || apiKey === "undefined") {
        // We don't throw here immediately as the platform may inject it late 
        // or it might be managed via global provider
        console.warn("GEMINI_API_KEY not found in environment, checking fallback...");
      }
      
      aiInstance = new GoogleGenAI({ apiKey: apiKey || "" });
    }
    return aiInstance;
  } catch (error) {
    console.error("Error in getAi initialization:", error);
    throw error;
  }
}

export async function parseEscrowFromPdf(base64Pdf: string): Promise<any> {
  return parseEscrow(base64Pdf, "application/pdf");
}

export async function parseEscrowFromText(text: string): Promise<any> {
  return parseEscrow(text, "text/plain");
}

async function parseEscrow(data: string, mimeType: string): Promise<any> {
  console.log(`Starting parsing for ${mimeType}. Data length:`, data.length);
  
  let ai;
  try {
    ai = getAi();
  } catch (err: any) {
    console.error("AI Init Error:", err.message);
    throw err;
  }
  
  const modelName = "gemini-3-flash-preview";
  console.log("Using model:", modelName);

  const dataPart = mimeType === "text/plain" 
    ? { text: data }
    : { inlineData: { mimeType, data } };

  const promptPart = {
    text: `You are an expert real estate escrow assistant. Extract the following escrow details from the provided document. 
If a field is missing, return an empty string or 0.

Fields (JSON keys):
address, clientFirstName, clientLastName, agentName, agentPhone, agentEmail, lenderName, lenderPhone, lenderEmail, escrowOfficer, escrowEmail, price (number), acceptanceDate (YYYY-MM-DD), coeDate (YYYY-MM-DD), status (Open/Closed/Cancelled), notes

Return ONLY a valid JSON object.`,
  };

  try {
    const parsePromise = ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [dataPart, promptPart] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            address: { type: Type.STRING },
            clientFirstName: { type: Type.STRING },
            clientLastName: { type: Type.STRING },
            agentName: { type: Type.STRING },
            agentPhone: { type: Type.STRING },
            agentEmail: { type: Type.STRING },
            lenderName: { type: Type.STRING },
            lenderPhone: { type: Type.STRING },
            lenderEmail: { type: Type.STRING },
            escrowOfficer: { type: Type.STRING },
            escrowEmail: { type: Type.STRING },
            price: { type: Type.NUMBER },
            acceptanceDate: { type: Type.STRING },
            coeDate: { type: Type.STRING },
            status: { type: Type.STRING },
            notes: { type: Type.STRING }
          }
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("AI took too long to respond (180s timeout). The file might be too large or the service is busy. Try pasting just the relevant text instead.")), 180000)
    );

    console.log("Awaiting Gemini response (timeout set to 180s)...");
    const response = await Promise.race([parsePromise, timeoutPromise]) as any;
    
    if (!response || !response.text) {
      console.error("AI response missing .text property:", response);
      throw new Error("AI returned an empty or unreadable response. Please try pasting the text instead.");
    }

    const text = response.text.trim();
    console.log("Gemini parsed success. JSON length:", text.length);
    
    try {
      return JSON.parse(text);
    } catch (jsonErr) {
      console.error("JSON Parse Error. Content:", text);
      throw new Error("AI returned invalid data format. Please try pasting the text instead.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("403") || error.message?.includes("API key")) {
      throw new Error("Invalid API Key. Please check your GEMINI_API_KEY in Settings.");
    }
    throw error;
  }
}
