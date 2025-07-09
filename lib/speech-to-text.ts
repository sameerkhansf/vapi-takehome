import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';

export class SpeechToTextService {
  private client: SpeechClient;
  private recognizer: string;
  private projectId: string;
  private location: string;

  constructor() {
    // Validate required environment variables
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }
    
    console.log('SpeechToTextService: Initializing with project:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('SpeechToTextService: Using location:', process.env.GOOGLE_CLOUD_LOCATION || 'us-central1');
    
    this.client = new SpeechClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.recognizer = `projects/${this.projectId}/locations/${this.location}/recognizers/voice-recognizer`;
    
    console.log('SpeechToTextService: Client initialized successfully');
  }

  async createRecognizer() {
    return Promise.resolve();
  }

  async transcribeAudio(audioData: Buffer): Promise<string> {
    try {
      console.log('Transcribing audio, buffer size:', audioData.length);
      
      const [response] = await this.client.recognize({
        config: {
          encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
        },
        audio: {
          content: audioData,
        },
      });

      console.log('Speech-to-Text response:', JSON.stringify(response, null, 2));

      if (response.results && response.results.length > 0) {
        const transcript = response.results
          .map(result => result.alternatives?.[0]?.transcript || '')
          .join(' ')
          .trim();
        
        console.log('Extracted transcript:', transcript);
        return transcript;
      }

      console.log('No results in Speech-to-Text response');
      return '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  async startStreamingRecognition(onTranscript: (transcript: string) => void) {
    const recognizeStream = this.client.streamingRecognize({
      config: {
        encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
      },
      interimResults: true,
    });

    recognizeStream.on('data', (data) => {
      if (data.results && data.results.length > 0) {
        const transcript = data.results
          .map((result: any) => result.alternatives?.[0]?.transcript || '')
          .join(' ');
        
        if (transcript) {
          onTranscript(transcript);
        }
      }
    });

    recognizeStream.on('error', (error) => {
      console.error('Streaming recognition error:', error);
    });

    return recognizeStream;
  }
}