
"use client";

import { useState, useEffect } from "react";
import Vapi from "@vapi-ai/web";

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);

export default function Home() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [conversation, setConversation] = useState<Array<{role: string, transcript: string, timestamp: Date, id: string}>>([]);
  const [callStatus, setCallStatus] = useState<string>("Ready to start");
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    vapi.on("call-start", () => {
      setIsCallActive(true);
      setCallStatus("Connected - You can speak now");
      setIsConnecting(false);
      setConversation([]); // Clear conversation on new call
    });

    vapi.on("call-end", () => {
      setIsCallActive(false);
      setCallStatus("Call ended");
      setIsConnecting(false);
    });

    vapi.on("message", (message) => {
      console.log("VAPI message:", message); // Debug log
      
      // Only process final transcripts to avoid duplicates
      if (message.type === "transcript" && message.transcriptType === "final") {
        const messageId = `${message.role}-${message.transcript}-${Date.now()}`;
        
        setConversation(prev => {
          // Check if message already exists to prevent duplicates
          const existingMessage = prev.find(msg => 
            msg.role === message.role && 
            msg.transcript === message.transcript &&
            Math.abs(new Date().getTime() - msg.timestamp.getTime()) < 5000 // Within 5 seconds
          );
          
          if (existingMessage) {
            return prev; // Don't add duplicate
          }
          
          return [...prev, {
            role: message.role,
            transcript: message.transcript,
            timestamp: new Date(),
            id: messageId
          }];
        });
      }
      
      if (message.type === "conversation-update") {
        setCallStatus("Processing your request...");
      }
    });

    vapi.on("speech-start", () => {
      setCallStatus("Listening...");
    });

    vapi.on("speech-end", () => {
      setCallStatus("Processing...");
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = async () => {
    setIsConnecting(true);
    setCallStatus("Connecting...");
    
    try {
      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful voice assistant. Keep your responses concise and natural for speech. You can help with questions, tasks, and general conversation.",
            },
          ],
          temperature: 0.7,
          maxTokens: 250,
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
      });
    } catch (error) {
      console.error("Failed to start call:", error);
      setCallStatus("Failed to connect");
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    setCallStatus("Ending call...");
    vapi.stop();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-2 text-center text-gray-800">Voice AI Assistant</h1>
        <p className="text-center text-gray-600 mb-8">Speak naturally - I'll listen, understand, and respond</p>
        
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <button
              className={`px-12 py-4 rounded-full text-white font-bold text-lg transition-all duration-300 ${
                isCallActive 
                  ? "bg-red-500 hover:bg-red-600 shadow-lg" 
                  : isConnecting 
                    ? "bg-yellow-500 cursor-not-allowed" 
                    : "bg-blue-500 hover:bg-blue-600 shadow-lg"
              }`}
              onClick={isCallActive ? endCall : startCall}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : isCallActive ? "🔴 End Call" : "🎤 Start Voice Chat"}
            </button>
          </div>
          
          <div className="text-center">
            <p className={`text-lg font-medium ${
              isCallActive ? "text-green-600" : "text-gray-600"
            }`}>
              {callStatus}
            </p>
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg p-6 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Conversation</h3>
          {conversation.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No conversation yet. Start a call to begin chatting!
            </p>
          ) : (
            <div className="space-y-4">
              {conversation.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    <p className="text-sm font-medium mb-1">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </p>
                    <p>{message.transcript}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>💡 Tip: Click "Start Voice Chat" and speak naturally. The AI will respond with voice.</p>
        </div>
      </div>
    </main>
  );
}
