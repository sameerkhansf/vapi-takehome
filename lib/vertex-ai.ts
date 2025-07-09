import { VertexAI } from '@google-cloud/vertexai';

export class VertexAIService {
  private vertexAI: VertexAI;
  private model: any;

  constructor() {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }
    
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
    
    this.model = this.vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
      },
    });
  }

  async generateResponse(prompt: string): Promise<string> {
    const systemInstruction = "Respond in plain English, without any Markdown, bullet points, asterisks, or special formatting. Write as if you are speaking naturally.";
    const fullPrompt = `${systemInstruction}\n\n${prompt}`;
    try {
      const result = await this.model.generateContent(fullPrompt);
      
      const response = result.response;
      
      let generatedText = '';
      
      if (typeof response.text === 'function') {
        try {
          generatedText = response.text();
        } catch (textError) {
          // Continue to fallback methods
        }
      }
      
      if (!generatedText && response.text && typeof response.text === 'string') {
        generatedText = response.text;
      }
      
      if (!generatedText && response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const part = candidate.content.parts[0];
          
          if (part.text) {
            generatedText = part.text;
          }
          else if (part.inlineData && part.inlineData.data) {
            generatedText = part.inlineData.data;
          }
        }
      }
      
      if (!generatedText || generatedText.trim().length === 0) {
        generatedText = "I'm sorry, I couldn't generate a response. Please try again.";
      }
      
      return generatedText.trim();
    } catch (error) {
      console.error('VertexAIService: Error generating response:', error);
      throw error;
    }
  }

  async generateStreamingResponse(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const result = await this.model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        let chunkText = '';
        
        if (chunk.candidates && chunk.candidates.length > 0) {
          const candidate = chunk.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            chunkText = candidate.content.parts[0].text || '';
          }
        }
        
        if (!chunkText && typeof chunk.text === 'function') {
          chunkText = chunk.text();
        }
        
        if (chunkText) {
          onChunk(chunkText);
        }
      }
    } catch (error) {
      console.error('Error generating streaming response:', error);
      throw error;
    }
  }

  async generateConversationResponse(
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  ): Promise<string> {
    try {
      const chat = this.model.startChat({
        history: messages.slice(0, -1),
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
          topP: 0.9,
        },
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = result.response;
      
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text || '';
        }
      }
      
      if (typeof response.text === 'function') {
        return response.text();
      }
      
      return '';
    } catch (error) {
      console.error('Error generating conversation response:', error);
      throw error;
    }
  }
}