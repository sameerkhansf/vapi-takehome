import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';

export class TextToSpeechService {
  private client: TextToSpeechClient;

  constructor() {
    // Validate required environment variables
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }
    
    console.log('TextToSpeechService: Initializing with project:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    
    this.client = new TextToSpeechClient();
    
    console.log('TextToSpeechService: Client initialized successfully');
  }

  async synthesizeSpeech(text: string, voiceName?: string): Promise<Buffer> {
    console.log('TextToSpeechService: Starting synthesizeSpeech with text length:', text.length);
    console.log('TextToSpeechService: Text preview:', text.substring(0, 50) + '...');
    
    // Validate input text
    if (!text || text.trim().length === 0) {
      console.log('TextToSpeechService: Empty text input, throwing error');
      throw new Error('Text input cannot be empty');
    }

    const fallbackVoices = [
      'en-US-Chirp3-HD-Aoede',
      'en-US-Chirp3-HD-Achernar', 
      'en-US-Chirp3-HD-Zephyr',
      'en-US-Neural2-D',
      'en-US-Neural2-C',
      'en-US-Standard-D'
    ];

    const targetVoice = voiceName || fallbackVoices[0];
    const cleanText = text.trim();
    
    console.log('TextToSpeechService: Using voice:', targetVoice);
    
    try {
      console.log('TextToSpeechService: Calling client.synthesizeSpeech...');
      const [response] = await this.client.synthesizeSpeech({
        input: { text: cleanText },
        voice: {
          languageCode: 'en-US',
          name: targetVoice,
        },
        audioConfig: {
          audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
        },
      });

      console.log('TextToSpeechService: synthesizeSpeech completed, audio content length:', response.audioContent?.length || 0);
      return response.audioContent as Buffer;
    } catch (error: any) {
      console.log('TextToSpeechService: Primary voice failed, trying fallbacks...');
      // Try fallback voices if the primary voice fails
      if (error.code === 3 && error.details?.includes('does not exist')) {
        for (const fallbackVoice of fallbackVoices) {
          if (fallbackVoice === targetVoice) continue; // Skip the already tried voice
          
          try {
            console.log('TextToSpeechService: Trying fallback voice:', fallbackVoice);
            const [response] = await this.client.synthesizeSpeech({
              input: { text: cleanText },
              voice: {
                languageCode: 'en-US',
                name: fallbackVoice,
              },
              audioConfig: {
                audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
                speakingRate: 1.0,
                pitch: 0.0,
                volumeGainDb: 0.0,
              },
            });

            console.log(`TextToSpeechService: Fallback voice ${fallbackVoice} succeeded`);
            return response.audioContent as Buffer;
          } catch (fallbackError) {
            console.warn(`TextToSpeechService: Fallback voice ${fallbackVoice} also failed:`, fallbackError);
            continue;
          }
        }
      }
      
      console.error('TextToSpeechService: All voices failed:', error);
      throw error;
    }
  }

  async synthesizeSpeechWithSSML(ssml: string, voiceName?: string): Promise<Buffer> {
    try {
      const [response] = await this.client.synthesizeSpeech({
        input: { ssml },
        voice: {
          languageCode: 'en-US',
          name: voiceName || 'en-US-Chirp3-HD-Aoede',
        },
        audioConfig: {
          audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
        },
      });

      return response.audioContent as Buffer;
    } catch (error) {
      console.error('Error synthesizing speech with SSML:', error);
      throw error;
    }
  }

  async getAvailableVoices(): Promise<any[]> {
    try {
      const [response] = await this.client.listVoices({
        languageCode: 'en-US',
      });

      return response.voices || [];
    } catch (error) {
      console.error('Error getting available voices:', error);
      throw error;
    }
  }

  async synthesizeWithCustomVoice(
    text: string,
    voiceConfig: {
      languageCode: string;
      name: string;
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
    }
  ): Promise<Buffer> {
    try {
      const [response] = await this.client.synthesizeSpeech({
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.name,
        },
        audioConfig: {
          audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
          speakingRate: voiceConfig.speakingRate || 1.0,
          pitch: voiceConfig.pitch || 0.0,
          volumeGainDb: voiceConfig.volumeGainDb || 0.0,
        },
      });

      return response.audioContent as Buffer;
    } catch (error) {
      console.error('Error synthesizing speech with custom voice:', error);
      throw error;
    }
  }

  createAudioDataUrl(audioBuffer: Buffer): string {
    const base64Audio = audioBuffer.toString('base64');
    return `data:audio/mp3;base64,${base64Audio}`;
  }
}