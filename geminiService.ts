
import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { AnalysisResult, FileData } from "./types";

const SYSTEM_INSTRUCTION = `
You are an Exam Paper Analysis Engine for 'Exam Helper App'.
Your job is to analyze uploaded Previous Year Question papers (PYQs) for a single subject.

RULES:
1. Treat all inputs as part of the same syllabus.
2. Normalize questions with slight wording changes as the same question.
3. Detect repetition patterns and topic frequency.
4. Think like a strict examiner.
5. NO emojis. NO motivational talk.

STRICT OUTPUT STRUCTURE (JSON):
- repeated_questions: List of { question, count, years }
- important_questions: Concept-based questions that frequently appear in some form.
- top_15: Exactly 15 questions that cover maximum syllabus and guarantee passing/high marks.
- notes: List of { topic, content (array of bullet points) } for last-day revision.
`;

export const analyzePapers = async (files: FileData[]): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing. Please set it in your Netlify Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = files.map(file => {
    const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
    return {
      inlineData: {
        data: base64Data,
        mimeType: file.type
      }
    };
  });

  parts.push({
    text: "Analyze these PYQs and provide a structured exam-oriented summary as defined in the system instructions. Focus on high-yield patterns."
  });

  const config: GenerateContentParameters = {
    model: 'gemini-3-flash-preview',
    contents: [{ parts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          repeated_questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                count: { type: Type.NUMBER },
                years: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["question", "count", "years"]
            }
          },
          important_questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          top_15: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          notes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["topic", "content"]
            }
          }
        },
        required: ["repeated_questions", "important_questions", "top_15", "notes"]
      }
    }
  };

  try {
    const result = await ai.models.generateContent(config);
    const text = result.text;
    if (!text) throw new Error("No response from AI engine.");
    return JSON.parse(text) as AnalysisResult;
  } catch (err: any) {
    console.error("Gemini Analysis Error:", err);
    throw err;
  }
};
