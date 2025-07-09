import { VertexAI } from '@google-cloud/vertexai';

export class VertexAIService {
  private vertexAI: VertexAI;
  private model: any;

  constructor() {
    // Validate required environment variables
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }
    
    console.log('VertexAIService: Initializing with project:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('VertexAIService: Using location:', process.env.GOOGLE_CLOUD_LOCATION || 'us-central1');
    
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
    
    console.log('VertexAIService: Model initialized successfully with gemini-2.0-flash-lite');
  }

  async generateResponse(prompt: string): Promise<string> {
    console.log('VertexAIService: Starting generateResponse with prompt:', prompt.substring(0, 100) + '...');
    try {
      console.log('VertexAIService: Calling model.generateContent...');
      const result = await this.model.generateContent(prompt);
      console.log('VertexAIService: generateContent completed, processing response...');
      
      const response = result.response;
      console.log('VertexAIService: Response object received:', typeof response);
      console.log('VertexAIService: Response structure:', JSON.stringify(response, null, 2));
      
      let generatedText = '';
      
      // Primary method: try to get text using the text() method
      if (typeof response.text === 'function') {
        console.log('VertexAIService: Using response.text() method');
        try {
          generatedText = response.text();
          console.log('VertexAIService: Text extracted via text() method:', generatedText.substring(0, 100) + '...');
        } catch (textError) {
          console.log('VertexAIService: text() method failed:', textError);
        }
      }
      
      // Fallback: try to access text property directly
      if (!generatedText && response.text && typeof response.text === 'string') {
        console.log('VertexAIService: Using response.text property directly');
        generatedText = response.text;
        console.log('VertexAIService: Direct text property extracted:', generatedText.substring(0, 100) + '...');
      }
      
      // Fallback: Handle candidates structure
      if (!generatedText && response.candidates && response.candidates.length > 0) {
        console.log('VertexAIService: Found candidates in response');
        const candidate = response.candidates[0];
        console.log('VertexAIService: Candidate structure:', JSON.stringify(candidate, null, 2));
        
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const part = candidate.content.parts[0];
          console.log('VertexAIService: Part structure:', JSON.stringify(part, null, 2));
          
          // Check for text property directly
          if (part.text) {
            generatedText = part.text;
            console.log('VertexAIService: Extracted text from part.text:', generatedText.substring(0, 100) + '...');
          }
          // Check for inlineData if text is not available
          else if (part.inlineData && part.inlineData.data) {
            generatedText = part.inlineData.data;
            console.log('VertexAIService: Extracted text from inlineData:', generatedText.substring(0, 100) + '...');
          }
        }
      }
      
      // Ensure we have some response text
      if (!generatedText || generatedText.trim().length === 0) {
        console.log('VertexAIService: No text generated, using fallback message');
        generatedText = "I'm sorry, I couldn't generate a response. Please try again.";
      }
      
      console.log('VertexAIService: Final generated text length:', generatedText.length);
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
        
        // Fallback: try to get text directly from chunk
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
      
      // Handle different response formats
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text || '';
        }
      }
      
      // Fallback: try to get text directly from response
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