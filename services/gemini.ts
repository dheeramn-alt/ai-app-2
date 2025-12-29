
import { GoogleGenAI, Type } from "@google/genai";
import { Story, Project } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
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
          Acceptance Criteria: A list of at least 3-5 functional requirements.
          Happy Path: A concise description of the successful user flow.
          Sad Path: A concise description of common error states or edge cases shown or implied.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          acceptanceCriteria: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
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
  const prompt = `You are a Senior Technical Product Manager. 
  I am providing you with structured data from a Figma Design file and some user context.
  User Context: "${userContext}"
  Figma Data: ${JSON.stringify(figmaData)}
  
  Please map every button to a user action and every input field to an acceptance criterion.
  Identify states (loading, error, success) implied by the design layers.
  
  Format the output as a valid JSON object.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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

export const summarizeProject = async (project: Project): Promise<string> => {
  const totalStories = project.epics.reduce((acc, e) => acc + e.stories.length, 0);
  if (totalStories === 0) return "Add some stories to see an AI summary of this project.";

  const storyTitles = project.epics.flatMap(e => e.stories.map(s => s.title)).join(', ');
  
  const prompt = `Write a two-sentence executive summary for the project "${project.title}" based on these story titles: ${storyTitles}. 
  Focus on the overall user value and the main goal of the project.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text || "Summary unavailable.";
};
