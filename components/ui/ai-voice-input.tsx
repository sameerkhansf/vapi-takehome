"use client";

import { Mic } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ErrorBoundary,
  VoiceAIError,
  handleMediaRecorderError,
  handleNetworkError,
  ERROR_CODES,
} from "@/lib/error-handler";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  onTranscript?: (transcript: string) => void;
  onResponse?: (response: string) => void;
  onAudioResponse?: (audioUrl: string) => void;
  onError?: (error: VoiceAIError) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

type ProcessingStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "processing"
  | "synthesizing"
  | "playing"
  | "error";

export function AIVoiceInput({
  onStart,
  onStop,
  onTranscript,
  onResponse,
  onAudioResponse,
  onError,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>("idle");
  const [error, setError] = useState<VoiceAIError | null>(null);
  const mounted = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const errorBoundaryRef = useRef<ErrorBoundary>(ErrorBoundary.getInstance());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWriterRef = useRef<WritableStreamDefaultWriter | null>(null);

  useEffect(() => {
    setIsClient(true);

    const handleError = (error: VoiceAIError) => {
      setError(error);
      setProcessingStatus("error");
      onError?.(error);
    };

    const errorBoundary = errorBoundaryRef.current;
    errorBoundary.addErrorCallback(handleError);

    return () => {
      errorBoundary.removeErrorCallback(handleError);
    };
  }, [onError]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      if (mounted.current && time > 0) {
        onStop?.(time);
      }
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: NodeJS.Timeout;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusMessage = () => {
    switch (processingStatus) {
      case "idle":
        return "Click to speak";
      case "recording":
        return "Listening...";
      case "transcribing":
        return "Transcribing audio...";
      case "processing":
        return "Generating response...";
      case "synthesizing":
        return "Creating speech...";
      case "playing":
        return "Playing response...";
      case "error":
        return "Error occurred";
      default:
        return "Click to speak";
    }
  };

  const getStatusColor = () => {
    switch (processingStatus) {
      case "idle":
        return "text-black/70 dark:text-white/70";
      case "recording":
        return "text-blue-600 dark:text-blue-400";
      case "transcribing":
        return "text-yellow-600 dark:text-yellow-400";
      case "processing":
        return "text-purple-600 dark:text-purple-400";
      case "synthesizing":
        return "text-green-600 dark:text-green-400";
      case "playing":
        return "text-indigo-600 dark:text-indigo-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-black/70 dark:text-white/70";
    }
  };

  const getButtonColor = () => {
    switch (processingStatus) {
      case "idle":
        return "bg-none hover:bg-black/10 dark:hover:bg-white/10";
      case "recording":
        return "bg-blue-100 dark:bg-blue-900/20";
      case "transcribing":
        return "bg-yellow-100 dark:bg-yellow-900/20";
      case "processing":
        return "bg-purple-100 dark:bg-purple-900/20";
      case "synthesizing":
        return "bg-green-100 dark:bg-green-900/20";
      case "playing":
        return "bg-indigo-100 dark:bg-indigo-900/20";
      case "error":
        return "bg-red-100 dark:bg-red-900/20";
      default:
        return "bg-none hover:bg-black/10 dark:hover:bg-white/10";
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript("");
      setResponse("");
      setIsProcessing(true);
      setIsRecording(true);
      setSubmitted(true);
      setProcessingStatus("recording");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setProcessingStatus("transcribing");
          const audioBlob = new Blob(audioChunks, {
            type: "audio/webm;codecs=opus",
          });

          const response = await fetch("/api/voice", {
            method: "POST",
            body: audioBlob,
            headers: {
              "Content-Type": "audio/webm;codecs=opus",
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to process audio");
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("Failed to get response reader");
          }

          const decoder = new TextDecoder();
          let accumulatedResponse = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedResponse += chunk;

            const lines = accumulatedResponse.split("\n");
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i];
              if (line.trim() === "") continue;
              try {
                const data = JSON.parse(line);
                if (data.transcript) {
                  setTranscript(data.transcript);
                  onTranscript?.(data.transcript);
                  setProcessingStatus("processing");
                }
                if (data.response) {
                  setResponse(data.response);
                  onResponse?.(data.response);
                  setProcessingStatus("synthesizing");
                }
                if (data.audioUrl) {
                  onAudioResponse?.(data.audioUrl);
                  setProcessingStatus("playing");
                  if (audioRef.current) {
                    audioRef.current.src = data.audioUrl;
                    audioRef.current.play().catch((error) => {
                      console.warn("Audio playback failed:", error);
                    });
                  }
                }
                if (data.error) {
                  throw new VoiceAIError(
                    data.error,
                    data.code || "UNKNOWN_ERROR"
                  );
                }
              } catch (parseError) {
                console.error(
                  "Error parsing JSON chunk:",
                  parseError,
                  "Chunk:",
                  line
                );
              }
            }
            accumulatedResponse = lines[lines.length - 1];
          }

          setIsProcessing(false);
          setProcessingStatus("idle");
        } catch (error) {
          const networkError = handleNetworkError(error);
          errorBoundaryRef.current.handleError(networkError);
          setIsProcessing(false);
          setIsRecording(false);
          setSubmitted(false);
          setProcessingStatus("error");
        }
      };

      mediaRecorder.onerror = (event) => {
        const error = handleMediaRecorderError(event.error);
        errorBoundaryRef.current.handleError(error);
        setIsProcessing(false);
        setIsRecording(false);
        setSubmitted(false);
        setProcessingStatus("error");
      };

      mediaRecorder.start(100);
    } catch (error) {
      const networkError = handleNetworkError(error);
      errorBoundaryRef.current.handleError(networkError);
      setIsProcessing(false);
      setIsRecording(false);
      setSubmitted(false);
      setProcessingStatus("error");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setSubmitted(false);
    }
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            getButtonColor()
          )}
          type="button"
          onClick={handleClick}
        >
          {submitted ? (
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "1.5s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            submitted
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                submitted
                  ? "bg-black/50 dark:bg-white/50 animate-pulse"
                  : "bg-black/10 dark:text-white/10 h-1"
              )}
              style={
                submitted && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1">
          <p
            className={cn(
              "h-4 text-xs transition-colors duration-300",
              getStatusColor()
            )}
          >
            {getStatusMessage()}
          </p>
          {(processingStatus === "transcribing" ||
            processingStatus === "processing" ||
            processingStatus === "synthesizing") && (
            <div className="w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 animate-pulse rounded-full"
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>

        {transcript && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>You said:</strong> {transcript}
            </p>
          </div>
        )}

        {response && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>AI Response:</strong> {response}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-2 p-3 bg-red-100 dark:bg-red-900 rounded-lg max-w-md">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Error:</strong> {error.message}
            </p>
            <button
              onClick={() => setError(null)}
              className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}
