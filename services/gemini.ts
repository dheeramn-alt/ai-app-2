
import { GoogleGenAI, Type } from "@google/genai";
import { Story, Project } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
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
 * Rewrites a section of text in a specific style.
 */
export const rewriteSection = async (text: string, style: 'technical' | 'concise' | 'descriptive'): Promise<string> => {
  const prompt = `Rewrite the following user story component to be more ${style}. Keep the same core meaning but change the tone and detail level.\n\nInput text: "${text}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text || text;
};

/**
 * Analyzes multiple stories within an epic to find potential conflicts or gaps.
 * Uses Gemini 3 Pro for complex reasoning.
 */
export const checkRequirementsConflicts = async (stories: Story[]): Promise<string> => {
  if (stories.length < 2) return "Not enough stories to analyze for conflicts.";

  const content = stories.map(s => `Story: ${s.title}\nDescription: ${s.description}\nACs: ${s.acceptanceCriteria.join(', ')}`).join('\n\n---\n\n');
  
  const prompt = `As a Senior Quality Assurance Engineer, analyze the following collection of user stories for a project. 
  Identify any functional contradictions, overlapping requirements, or logical gaps between them.
  Be concise and highlight specific stories that conflict. If no major issues are found, simply say "No major conflicts detected."
  
  Stories to analyze:
  ${content}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt
  });

  return response.text || "Analysis failed.";
};

/**
 * Generates a high-level executive summary for a project.
 */
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
