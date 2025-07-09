import { NextRequest, NextResponse } from 'next/server';
import { SpeechToTextService } from '@/lib/speech-to-text';
import { VertexAIService } from '@/lib/vertex-ai';
import { TextToSpeechService } from '@/lib/text-to-speech';
import { handleGoogleCloudError } from '@/lib/error-handler';

export const runtime = 'nodejs'; // Use Node.js runtime for Google Cloud libraries

export async function POST(request: NextRequest) {
  console.log('Voice API: Request received');
  
  try {
    const speechToText = new SpeechToTextService();
    const vertexAI = new VertexAIService();
    const textToSpeech = new TextToSpeechService();

    if (!request.body) {
      console.log('Voice API: No request body');
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    // Read the audio blob from the request
    const audioBuffer = Buffer.from(await request.arrayBuffer());
    console.log('Voice API: Audio buffer length:', audioBuffer.length);

    if (audioBuffer.length === 0) {
      console.log('Voice API: Empty audio buffer');
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Transcribe the audio first
          console.log('Voice API: Starting transcription...');
          const transcript = await speechToText.transcribeAudio(audioBuffer);
          console.log('Voice API: Transcript received:', transcript);

          if (!transcript || !transcript.trim()) {
            console.log('Voice API: No speech detected');
            const errorData = JSON.stringify({ 
              error: 'No speech detected in audio',
              transcript: ''
            }) + '\n';
            controller.enqueue(new TextEncoder().encode(errorData));
            controller.close();
            return;
          }

          // Send transcript to client
          console.log('Voice API: Sending transcript to client...');
          const transcriptData = JSON.stringify({
            transcript: transcript,
            isFinal: false
          }) + '\n';
          controller.enqueue(new TextEncoder().encode(transcriptData));

          // Generate AI response
          console.log('Voice API: Attempting to generate AI response...');
          const aiResponse = await vertexAI.generateResponse(transcript);
          console.log('Voice API: AI Response received:', aiResponse);

          // Synthesize speech
          console.log('Voice API: Attempting to synthesize speech...');
          const speechBuffer = await textToSpeech.synthesizeSpeech(aiResponse);
          const audioDataUrl = textToSpeech.createAudioDataUrl(speechBuffer);
          console.log('Voice API: Speech synthesized, audioDataUrl length:', audioDataUrl.length);

          // Send final response to client
          console.log('Voice API: Sending final response...');
          const finalData = JSON.stringify({
            transcript: transcript,
            response: aiResponse,
            audioUrl: audioDataUrl,
            isFinal: true
          }) + '\n';
          controller.enqueue(new TextEncoder().encode(finalData));
          controller.close();

        } catch (error) {
          console.error('Voice API: Error in stream processing:', error);
          const voiceError = handleGoogleCloudError(error);
          const errorData = JSON.stringify({ 
            error: voiceError.message, 
            code: voiceError.code 
          }) + '\n';
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      }
    });

    // Return the streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Voice API error:', error);
    const voiceError = handleGoogleCloudError(error);
    return NextResponse.json(
      { error: voiceError.message, code: voiceError.code },
      { status: 500 }
    );
  }
}