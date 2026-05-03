import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export async function askPropertyAI(propertyContext: string, question: string): Promise<string> {
  if (!ai) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = `You are a helpful AI assistant for VaultStay, a web3 real estate rental platform.
The user is viewing a property with the following details:
${propertyContext}

Please answer the user's question about this property briefly and helpfully.
Question: ${question}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text ?? 'No response from AI.';
  } catch (error) {
    console.error('Error with Gemini AI:', error);
    return 'Sorry, the AI assistant is currently unavailable.';
  }
}

export async function generateListingDescription(details: {
  city: string;
  country: string;
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
}): Promise<string> {
  if (!ai) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = `You are an expert real estate copywriter. Write a compelling, attractive, and concise description for a rental property on VaultStay (a decentralized rental platform).
Property Details:
- Location: ${details.city}, ${details.country}
- Bedrooms: ${details.bedrooms}
- Bathrooms: ${details.bathrooms}
- Amenities: ${details.amenities.join(', ')}

Keep it under 3 paragraphs. Focus on the benefits of the amenities and the location.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text ?? '';
  } catch (error) {
    console.error('Error generating description:', error);
    throw error;
  }
}

export async function suggestPrice(details: {
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
}): Promise<{ rent: string; deposit: string }> {
  if (!ai) throw new Error('Gemini API key is not configured');

  const prompt = `As an expert web3 real estate appraiser, suggest a competitive daily rent amount and security deposit in ETH for the following property on a decentralized rental platform.
Property:
- Location: ${details.city}, ${details.country}
- Bedrooms: ${details.bedrooms}
- Bathrooms: ${details.bathrooms}
- Amenities: ${details.amenities.join(', ')}

Provide ONLY a valid JSON object in this exact format, with no markdown, no quotes around the brackets, and no other text:
{
  "rent": "0.05",
  "deposit": "0.02"
}
Make the values realistic ETH amounts (e.g. rent between 0.01 and 0.5 ETH).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsed = JSON.parse(text);
    return { rent: parsed.rent || "0.1", deposit: parsed.deposit || "0.05" };
  } catch (error) {
    console.error('Error suggesting price:', error);
    throw error;
  }
}

export async function magicSearch(query: string, listingsData: string): Promise<number[]> {
  if (!ai) return [];

  const prompt = `You are an intelligent real estate matching engine. 
The user is searching for: "${query}"

Here is a JSON list of available rental listings:
${listingsData}

Based ONLY on the user's query and the provided listings, return a JSON array of the "id"s of the listings that best match the query. 
If none match, return an empty array [].
Return ONLY the JSON array (e.g. [1, 5, 12]), no other text or markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '[]';
    return JSON.parse(text);
  } catch (error) {
    console.error('Error in magic search:', error);
    return [];
  }
}

export async function explainEscrow(escrowDetails: string): Promise<string> {
  if (!ai) return 'AI not configured.';

  const prompt = `You are a friendly legal-tech assistant. Explain the following decentralized escrow terms in simple, plain English (under 3 sentences) for a non-technical user.
Escrow Details:
${escrowDetails}

Focus on what happens next and who holds the funds right now.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text ?? 'Could not generate explanation.';
  } catch (error) {
    console.error('Error explaining escrow:', error);
    return 'Error explaining escrow terms.';
  }
}

export async function analyzePropertyImages(base64Images: string[]): Promise<{
  title: string;
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
}> {
  if (!ai) throw new Error('Gemini API key is not configured');
  
  // Format the images for Gemini API
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      data: base64.split(',')[1] || base64, // Remove data URI prefix if present
      mimeType: base64.includes('image/png') ? 'image/png' : 'image/jpeg',
    }
  }));

  const prompt = `You are an expert real estate appraiser. Look at these property images and analyze them.
Extract and deduce the following information. Be realistic but optimistic.
Return ONLY a valid JSON object in this exact format, with no markdown formatting:
{
  "title": "A catchy title for the listing",
  "amenities": ["WiFi", "Pool", "Ocean View", "Modern Kitchen"],
  "bedrooms": 2,
  "bathrooms": 1
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, ...imageParts],
    });
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || '',
      amenities: parsed.amenities || [],
      bedrooms: parsed.bedrooms || 1,
      bathrooms: parsed.bathrooms || 1,
    };
  } catch (error) {
    console.error('Error analyzing images:', error);
    throw error;
  }
}

export async function getLandlordTrustScore(address: string, listingsInfo: string): Promise<{
  score: number;
  analysis: string;
}> {
  if (!ai) return { score: 50, analysis: "AI not configured." };

  const prompt = `You are a decentralized identity and trust scoring bot. Analyze the on-chain activity for landlord: ${address}.
Here is the JSON summary of their created escrow contracts:
${listingsInfo}

Calculate a trust score out of 100 based on their completed and active listings. Give a 1-paragraph summary of why they earned this score.
Return ONLY a JSON object in this exact format, with no markdown:
{
  "score": 85,
  "analysis": "This landlord has successfully completed multiple escrows without dispute."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error('Error analyzing trust score:', error);
    return { score: 50, analysis: "Error generating trust score." };
  }
}

export async function getDashboardInsights(portfolioStats: string): Promise<string> {
  if (!ai) return "AI not configured.";

  const prompt = `You are an AI financial advisor for a web3 landlord. Analyze their portfolio of decentralized rentals:
${portfolioStats}

Give them 2-3 bullet points of actionable advice to increase their rental yield, occupancy rate, or to manage their escrows better. Keep it concise, friendly, and web3-native.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text ?? 'No insights generated.';
  } catch (error) {
    console.error('Error generating insights:', error);
    return 'Could not generate portfolio insights at this time.';
  }
}

