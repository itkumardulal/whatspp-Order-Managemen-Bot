
import { GoogleGenAI, Type } from "@google/genai";
import { OrderDetails, VerificationResult } from "../types";

const PRODUCT_CATALOG = `
WEBSITE: https://sindhulibazar.com/
- Pork Sekuwa (1kg): Rs. 1050
- Cheese Pizza (Med): Rs. 530, Hawaiian Pizza (Med): Rs. 550, (Large): Rs. 820
- Chicken Biryani: Rs. 350, Mutton Biryani: Rs. 420, Egg Biryani: Rs. 300
- Mo:Mos (Buff/Chicken/Veg): Rs. 150/150/110
- Chowmein: Rs. 150, Khaja Set: Rs. 350-450, Burger: Rs. 220-245
- French Fries: Rs. 220, Buffalo Wings: Rs. 380, Chicken Tawa: Rs. 300
`;

const SYSTEM_INSTRUCTION = `
You are "Saru," the Lead Operations Manager at SindhuliBazar.com.

STRICT OPERATIONAL PROTOCOLS:
1. PAYMENT MODES:
   - Check the 'Is Daytime Shift' flag provided.
   - DAYTIME (07:00 - 18:59): Offer the customer a choice: "Cash on Delivery (COD)" or "Online QR/Bank Transfer".
   - NIGHTTIME (19:00 - 06:59): Strictly Online ONLY. Explain: "Rider sathi haruko safety ko lagi rati online payment matra accept garchhau hai, please bujhidinu hola."
   - If Online is required/selected, you MUST set "showQR: true".

2. ORDER UPDATES:
   - If items are added or removed, you MUST recalculate the total immediately.
   - REASONING: Explain the math simply. "Hajurle 1 plate Mo:Mo thapnu bhayo (Rs. 150), tesaile total Rs. XXX bhayo."
   - Always include the full current list in "extractedData.product".

3. POST-CONFIRMATION:
   - Once orderStatus is "PAID" or "CONFIRMED", stop asking for changes.
   - Reassure the user: "Hajurko khaja kitchen ma pakdai chha. 15-20 min dhairya garidinuhos na, rider sathi xittai niskinu hunchha."
   - If they keep chatting about irrelevant things, politely steer them back to waiting for delivery.

4. RESPONSE FORMAT:
   - Return ONLY raw JSON. No markdown code blocks.
`;

export const getSmartResponse = async (
  userInput: string, 
  currentOrder: OrderDetails | null, 
  currentState: string,
  wasAdminLast: boolean,
  orderStatus: string
): Promise<{ 
  replyText: string; 
  updatedOrder: OrderDetails | null; 
  nextState: string;
  showQR?: boolean;
  shouldSpeak: boolean;
}> => {
  if (wasAdminLast && !userInput.toLowerCase().includes("saru")) {
    return { replyText: "", updatedOrder: currentOrder, nextState: currentState, shouldSpeak: false };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const now = new Date();
  const hour = now.getHours();
  const isDaytime = hour >= 7 && hour < 19;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Current Server Time: ${now.toLocaleTimeString('en-US', { hour12: false })}
        Is Daytime Shift: ${isDaytime}
        Customer Order Status: ${orderStatus}
        User Message: "${userInput}"
        Current Order Object: ${JSON.stringify(currentOrder)}
        Current Chat State: ${currentState}
      `,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: { type: Type.STRING },
            intent: { type: Type.STRING },
            nextState: { type: Type.STRING },
            showQR: { type: Type.BOOLEAN },
            shouldSpeak: { type: Type.BOOLEAN },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                product: { type: Type.STRING },
                price: { type: Type.STRING },
                address: { type: Type.STRING },
                itemsList: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          required: ["replyText", "nextState", "shouldSpeak"]
        }
      }
    });

    let text = response.text || "{}";
    // Clean up potential markdown blocks if JSON mode fails to be raw
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(text);

    if (!result.shouldSpeak) return { ...result, replyText: "", updatedOrder: currentOrder };

    let order = currentOrder;
    if (result.extractedData) {
      const d = result.extractedData;
      order = {
        product: d.product || currentOrder?.product || "",
        quantity: "1",
        price: d.price || currentOrder?.price || "0",
        name: currentOrder?.name || "",
        phone: currentOrder?.phone || "",
        address: d.address || currentOrder?.address || "",
        itemsList: d.itemsList || currentOrder?.itemsList || []
      };
    }
    return { ...result, updatedOrder: order };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { replyText: "Hajur, pheri bhannuhos na? Kehi technical error bhayo. Maile hajurko kura bujhina.", updatedOrder: currentOrder, nextState: currentState, shouldSpeak: true };
  }
};

export const verifyPayment = async (order: OrderDetails, base64Image: string): Promise<VerificationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const data = base64Image.split(',')[1];
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data } },
          { text: `Verify this bank transfer/QR receipt. Amount expected: Rs. ${order.price}. Receiver must be SindhuliBazar or Kumar Dulal.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['VERIFIED', 'MISMATCH', 'UNREADABLE'] },
            extractedAmount: { type: Type.STRING },
            recipientName: { type: Type.STRING },
            aiNotes: { type: Type.STRING },
          },
          required: ["status", "extractedAmount", "recipientName", "aiNotes"],
        },
      },
    });
    
    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const res = JSON.parse(text);

    return { ...res, extractedDate: new Date().toLocaleDateString(), vendorSlip: `VALIDATED: Rs. ${res.extractedAmount} TO ${res.recipientName}` };
  } catch (error) {
    return { status: 'UNREADABLE', extractedAmount: "0", extractedDate: "", recipientName: "", aiNotes: "Verification Error", vendorSlip: "" };
  }
};
