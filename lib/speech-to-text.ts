import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';

export class SpeechToTextService {
  private client: SpeechClient;
  private recognizer: string;
  private projectId: string;
  private location: string;

  constructor() {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }
    
    this.client = new SpeechClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.recognizer = `projects/${this.projectId}/locations/${this.location}/recognizers/voice-recognizer`;
  }

  async createRecognizer() {
    return Promise.resolve();
  }

  async transcribeAudio(audioData: Buffer): Promise<string> {
    try {
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

      if (response.results && response.results.length > 0) {
        const transcript = response.results
          .map(result => result.alternatives?.[0]?.transcript || '')
          .join(' ')
          .trim();
        
        return transcript;
      }

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