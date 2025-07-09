import { NextRequest, NextResponse } from 'next/server';
import { SpeechToTextService } from '@/lib/speech-to-text';
import { VertexAIService } from '@/lib/vertex-ai';
import { TextToSpeechService } from '@/lib/text-to-speech';
import { handleGoogleCloudError } from '@/lib/error-handler';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const speechToText = new SpeechToTextService();
    const vertexAI = new VertexAIService();
    const textToSpeech = new TextToSpeechService();

    if (!request.body) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await request.arrayBuffer());

    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: 'No audio data received' }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const transcript = await speechToText.transcribeAudio(audioBuffer);

          if (!transcript || !transcript.trim()) {
            const errorData = JSON.stringify({ 
              error: 'No speech detected in audio',
              transcript: ''
            }) + '\n';
            controller.enqueue(new TextEncoder().encode(errorData));
            controller.close();
            return;
          }

          const transcriptData = JSON.stringify({
            transcript: transcript,
            isFinal: false
          }) + '\n';
          controller.enqueue(new TextEncoder().encode(transcriptData));

          const aiResponse = await vertexAI.generateResponse(transcript);

          const speechBuffer = await textToSpeech.synthesizeSpeech(aiResponse);
          const audioDataUrl = textToSpeech.createAudioDataUrl(speechBuffer);

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