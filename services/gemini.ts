
import { GoogleGenAI, Type } from "@google/genai";
import { Story, Project } from "../types";

/**
 * Expert Documentation Engine Powered by Google Gemini.
 * Uses the @google/genai SDK as per standard guidelines.
 */
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface GeneratedStory {
  description: string;
  acceptanceCriteria: string[];
  happyPath: string;
  sadPath: string;
}

/**
 * Analyzes a UI screenshot and generates a complete user story structure.
 */
export const analyzeFigmaDesign = async (imageBase64: string, title: string): Promise<GeneratedStory> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', 
    contents: [
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64,
        },
      },
      {
        text: `You are an expert product manager. Analyze this UI screenshot and write a detailed User Story titled "${title}". 
        The output should be in JSON format matching the following schema.
        Description: Write a "As a [role], I want to [action], so that [value]" style description.
        Acceptance Criteria: A list of requirements.
        Happy Path: Success user flow.
        Sad Path: Error states or edge cases.`,
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
          happyPath: { type: Type.STRING },
          sadPath: { type: Type.STRING }
        },
        required: ['description', 'acceptanceCriteria', 'happyPath', 'sadPath']
      }
    }
  });

  try {
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error('Model returned an empty response');
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse Gemini response', e);
    throw new Error('Failed to generate story content');
  }
};

/**
 * Generates a story from Figma JSON data (simulated Figma API details).
 */
export const generateStoryFromFigmaData = async (figmaData: any, userContext: string): Promise<GeneratedStory> => {
  const ai = getAiClient();
  const prompt = `You are a Senior Technical Product Manager. 
  User Context: "${userContext}"
  Figma Data: ${JSON.stringify(figmaData)}
  Map buttons to actions and inputs to acceptance criteria. Return JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
          happyPath: { type: Type.STRING },
          sadPath: { type: Type.STRING }
        },
        required: ['description', 'acceptanceCriteria', 'happyPath', 'sadPath']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

/**
 * Summarizes the project status.
 */
export const summarizeProject = async (project: Project): Promise<string> => {
  const totalStories = project.epics.reduce((acc, e) => acc + e.stories.length, 0);
  if (totalStories === 0) return "Add some stories to see an AI summary.";

  const ai = getAiClient();
  const storyTitles = project.epics.flatMap(e => e.stories.map(s => s.title)).join(', ');
  const prompt = `Write a two-sentence executive summary for the project "${project.title}" based on these features: ${storyTitles}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text || "Summary unavailable.";
};
