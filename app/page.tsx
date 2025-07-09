"use client";

import { useState, useEffect, useRef } from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";
import { VoiceAIError } from "@/lib/error-handler";

export default function Home() {
  const [conversation, setConversation] = useState<
    Array<{ role: string; transcript: string; timestamp: Date; id: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleTranscript = (transcript: string) => {
    const messageId = `user-${transcript}-${Date.now()}`;
    setConversation((prev) => [
      ...prev,
      {
        role: "user",
        transcript,
        timestamp: new Date(),
        id: messageId,
      },
    ]);
  };

  const handleResponse = (response: string) => {
    const messageId = `assistant-${response}-${Date.now()}`;
    setConversation((prev) => [
      ...prev,
      {
        role: "assistant",
        transcript: response,
        timestamp: new Date(),
        id: messageId,
      },
    ]);
  };

  const handleError = (error: VoiceAIError) => {
    setError(error.message);
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full bg-surface-DEFAULT rounded-xl shadow-xl p-8 border border-border-DEFAULT">
          <h1 className="text-4xl font-extrabold mb-2 text-center text-primary-dark">
            Voice AI Assistant
          </h1>
          <p className="text-center text-secondary-DEFAULT mb-8">
            Speak naturally - I&apos;ll listen, understand, and respond
          </p>

          {error && (
            <div
              className="mb-6 bg-error/10 border border-error text-error px-4 py-3 rounded-lg shadow-sm"
              role="alert"
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-error hover:text-error-dark text-xs mt-2 underline focus:outline-none focus:ring-2 focus:ring-error focus:ring-opacity-50"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <AIVoiceInput
              onTranscript={handleTranscript}
              onResponse={handleResponse}
              onError={handleError}
              demoMode={false}
            />
          </div>

          <div className="mt-8 space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                💡 <strong>How it works:</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-semibold text-primary mb-1">
                    1. Speak
                  </div>
                  <div>Click the microphone and speak naturally</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-semibold text-primary mb-1">
                    2. Process
                  </div>
                  <div>AI transcribes, understands, and responds</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-semibold text-primary mb-1">
                    3. Listen
                  </div>
                  <div>Hear the AI response in natural speech</div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <p>
                Powered by Google Cloud Speech-to-Text, Vertex AI, and
                Text-to-Speech
              </p>
            </div>
          </div>

          <div ref={conversationEndRef} />
        </div>
      </div>
    </AuroraBackground>
  );
}
