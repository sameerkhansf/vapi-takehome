"use client";

import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";

// Initialize VAPI client with public key only
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);

export default function Home() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [conversation, setConversation] = useState<
    Array<{ role: string; transcript: string; timestamp: Date; id: string }>
  >([]);
  const [callStatus, setCallStatus] = useState<string>("Ready to start");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Handle VAPI client events
  useEffect(() => {
    if (!isClient) return;

    const handleCallStart = () => {
      try {
        setIsCallActive(true);
        setCallStatus("Connected - You can speak now");
        setIsConnecting(false);
        setError(null);
        setConversation([]); // Clear conversation on new call
      } catch (error) {
        console.error("Error in call start handler:", error);
        setError("Failed to start call properly");
      }
    };

    const handleCallEnd = () => {
      try {
        setIsCallActive(false);
        setCallStatus("Call ended");
        setIsConnecting(false);
      } catch (error) {
        console.error("Error in call end handler:", error);
        setError("Error ending call");
      }
    };

    const handleMessage = (message: any) => {
      try {
        console.log("VAPI message:", message); // Debug log

        // Only process final transcripts to avoid duplicates
        if (
          message.type === "transcript" &&
          message.transcriptType === "final"
        ) {
          const messageId = `${message.role}-${
            message.transcript
          }-${Date.now()}`;

          setConversation((prev) => {
            // Check if message already exists to prevent duplicates
            const existingMessage = prev.find(
              (msg) =>
                msg.role === message.role &&
                msg.transcript === message.transcript &&
                Math.abs(new Date().getTime() - msg.timestamp.getTime()) < 5000 // Within 5 seconds
            );

            if (existingMessage) {
              return prev; // Don't add duplicate
            }

            return [
              ...prev,
              {
                role: message.role,
                transcript: message.transcript,
                timestamp: new Date(),
                id: messageId,
              },
            ];
          });
        }

        if (message.type === "conversation-update") {
          setCallStatus("Processing your request...");
        }
      } catch (error) {
        console.error("Error processing message:", error);
        setError("Error processing message");
      }
    };

    const handleSpeechStart = () => {
      try {
        setCallStatus("Listening...");
      } catch (error) {
        console.error("Error in speech start handler:", error);
      }
    };

    const handleSpeechEnd = () => {
      try {
        setCallStatus("Processing...");
      } catch (error) {
        console.error("Error in speech end handler:", error);
      }
    };

    const handleError = (error: any) => {
      try {
        console.error("VAPI error:", error);

        // Don't show audio processor errors to user
        if (!error.message?.includes("audio processor")) {
          setError(`Connection error: ${error.message || "Unknown error"}`);
          setIsCallActive(false);
          setIsConnecting(false);
        }
      } catch (handlerError) {
        console.error("Error in error handler:", handlerError);
      }
    };

    // Add event listeners
    try {
      vapi.on("call-start", handleCallStart);
      vapi.on("call-end", handleCallEnd);
      vapi.on("message", handleMessage);
      vapi.on("speech-start", handleSpeechStart);
      vapi.on("speech-end", handleSpeechEnd);
      vapi.on("error", handleError);
    } catch (error) {
      console.error("Error setting up VAPI event listeners:", error);
      setError("Failed to initialize voice assistant");
    }

    // Cleanup
    return () => {
      try {
        vapi.off("call-start", handleCallStart);
        vapi.off("call-end", handleCallEnd);
        vapi.off("message", handleMessage);
        vapi.off("speech-start", handleSpeechStart);
        vapi.off("speech-end", handleSpeechEnd);
        vapi.off("error", handleError);
        vapi.stop();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, [isClient]);

  const startCall = async () => {
    if (!isClient) return;

    setIsConnecting(true);
    setCallStatus("Connecting...");
    setError(null);

    try {
      const assistantConfig = {
        model: {
          provider: "openai" as const,
          model: "gpt-4o-mini" as const,
          messages: [
            {
              role: "system" as const,
              content:
                "You are a helpful voice assistant. Keep your responses concise and natural for speech. You can help with questions, tasks, and general conversation.",
            },
          ],
          temperature: 0.7,
          maxTokens: 250,
        },
        voice: {
          provider: "11labs" as const,
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
        transcriber: {
          provider: "deepgram" as const,
          model: "nova-2",
          language: "en-US" as const,
        },
      };

      // Start the call using the client SDK (for real-time functionality)
      await vapi.start(assistantConfig);
    } catch (error) {
      console.error("Failed to start call:", error);
      setCallStatus("Failed to connect");
      setIsConnecting(false);
      setError(
        `Failed to start call: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const endCall = () => {
    try {
      setCallStatus("Ending call...");
      vapi.stop();
    } catch (error) {
      console.error("Error ending call:", error);
      setError("Error ending call");
      setIsCallActive(false);
      setIsConnecting(false);
    }
  };

  // Check for required environment variables
  if (isClient && !process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-500/90 backdrop-blur-sm rounded-2xl p-6 text-white text-center">
            <div className="font-medium mb-2">Setup Required</div>
            <div className="text-sm opacity-90">
              Please set your VAPI public key in the environment variables
              (NEXT_PUBLIC_VAPI_PUBLIC_KEY).
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AuroraBackground>
      <div className="max-w-2xl w-full bg-surface-DEFAULT rounded-xl shadow-xl p-8 border border-border-DEFAULT">
        <h1 className="text-4xl font-extrabold mb-2 text-center text-primary-dark">
          Voice AI Assistant
        </h1>
        <p className="text-center text-secondary-DEFAULT mb-8">
          Speak naturally - I&apos;ll listen, understand, and respond
        </p>

        {/* Error Display */}
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
            onStart={startCall}
            onStop={(duration) => {
              endCall();
              console.log(`Call ended after ${duration} seconds`);
            }}
            demoMode={false} // Set to true for demo mode
          />
          <div className="text-center">
            <p
              className={`text-lg font-semibold ${
                isCallActive ? "text-success" : "text-secondary-DEFAULT"
              }`}
            >
              {callStatus}
            </p>
          </div>
        </div>

        <div className="bg-surface-DEFAULT rounded-xl p-6 max-h-96 overflow-y-auto border border-border-DEFAULT shadow-inner">
          <h3 className="text-xl font-semibold mb-4 text-primary-dark">
            Conversation
          </h3>
          {conversation.length === 0 ? (
            <p className="text-secondary-light text-center py-8 italic">
              No conversation yet. Start a call to begin chatting!
            </p>
          ) : (
            <div className="space-y-4">
              {conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl shadow-md ${
                      message.role === "user"
                        ? "bg-primary text-white rounded-br-none" // User message style
                        : "bg-secondary-light text-secondary-dark rounded-bl-none"
                    }`}
                  >
                    (
                    <p className="text-sm font-medium mb-1 opacity-90">
                      {message.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p className="text-base">{message.transcript}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={conversationEndRef} />
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-secondary-DEFAULT">
          <p>
            💡 Tip: Click &quot;Start Voice Chat&quot; and speak naturally. The
            AI will respond with voice.
          </p>
        </div>
      </div>
    </AuroraBackground>
  );
}
