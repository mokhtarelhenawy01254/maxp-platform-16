/**
 * @module imageIntentClassifier
 * @description Image intent classifier using Gemini vision capabilities.
 * Classifies image attachments to decide if they should trigger catalog search.
 * 
 * Solves ISSUE #3: Image Intent Classification
 */

const episodicMemoryService = require('../episodicMemoryService');

/**
 * Classify the intent of an uploaded image.
 * 
 * @param {Buffer|string} imageBytes - The image content (Buffer or base64 string)
 * @param {string} [mimeType='image/jpeg'] - The image mime type
 * @returns {Promise<'PRODUCT_MATCH' | 'COLOR_REFERENCE' | 'PAYMENT_RECEIPT' | 'DAMAGE_REPORT'>}
 */
async function classifyImageIntent(imageBytes, mimeType = 'image/jpeg') {
  try {
    const apiKey = await episodicMemoryService.getGeminiApiKey();
    if (!apiKey) {
      console.warn('[IMAGE-CLASSIFIER] No API key available, defaulting to PRODUCT_MATCH');
      return 'PRODUCT_MATCH';
    }

    const base64Data = Buffer.isBuffer(imageBytes)
      ? imageBytes.toString('base64')
      : imageBytes;

    if (!base64Data) {
      return 'PRODUCT_MATCH';
    }

    const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
    // Using gemini-1.5-flash as the standard fast vision model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are an image intent classifier for an e-commerce chat system.
Analyze the uploaded image and classify it into exactly one of the following categories:

1. PRODUCT_MATCH: A clear photo of an e-commerce catalog product (e.g. shoe, dress, bag, pants, watch, shirt, glasses) that the customer wants to find, buy, or match in our catalog.
2. COLOR_REFERENCE: A photo showing a color palette, fabric pattern, or style reference, usually accompanied by questions like "do you have this color or style?".
3. PAYMENT_RECEIPT: A transaction receipt, bank transfer transfer confirmation, mobile wallet transfer screenshot, invoice, or check showing payment.
4. DAMAGE_REPORT: A photo showing a damaged, defective, torn, broken, or wrong product that the customer is complaining about.

Return a JSON object with a single key "intent" containing one of these four string values: "PRODUCT_MATCH", "COLOR_REFERENCE", "PAYMENT_RECEIPT", "DAMAGE_REPORT".
Do NOT include any markdown formatting, backticks, or text outside the JSON.
Example output: {"intent": "PRODUCT_MATCH"}`;

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[IMAGE-CLASSIFIER] Gemini API error (${response.status}): ${errText}`);
      return 'PRODUCT_MATCH';
    }

    const data = await response.json();
    const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResult) {
      const parsed = JSON.parse(textResult.trim());
      const intent = parsed?.intent;
      if (['PRODUCT_MATCH', 'COLOR_REFERENCE', 'PAYMENT_RECEIPT', 'DAMAGE_REPORT'].includes(intent)) {
        console.log(`[IMAGE-CLASSIFIER] Successfully classified image intent: ${intent}`);
        return intent;
      }
    }
  } catch (e) {
    console.warn('[IMAGE-CLASSIFIER] Exception during classification:', e.message);
  }

  // Safe fallback to avoid blocking valid customer searches
  return 'PRODUCT_MATCH';
}

module.exports = {
  classifyImageIntent,
};
