export class VoiceAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VoiceAIError';
  }
}

export const ERROR_CODES = {
  MICROPHONE_ACCESS_DENIED: 'MICROPHONE_ACCESS_DENIED',
  RECORDING_FAILED: 'RECORDING_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  TTS_FAILED: 'TTS_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_AUDIO_FORMAT: 'INVALID_AUDIO_FORMAT',
  GOOGLE_CLOUD_ERROR: 'GOOGLE_CLOUD_ERROR',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.MICROPHONE_ACCESS_DENIED]: 'Please allow microphone access to use voice features',
  [ERROR_CODES.RECORDING_FAILED]: 'Failed to record audio. Please try again.',
  [ERROR_CODES.TRANSCRIPTION_FAILED]: 'Failed to transcribe speech. Please speak clearly and try again.',
  [ERROR_CODES.AI_GENERATION_FAILED]: 'Failed to generate AI response. Please try again.',
  [ERROR_CODES.TTS_FAILED]: 'Failed to generate speech audio. Please try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [ERROR_CODES.INVALID_AUDIO_FORMAT]: 'Invalid audio format. Please try recording again.',
  [ERROR_CODES.GOOGLE_CLOUD_ERROR]: 'Google Cloud service error. Please try again later.',
} as const;

export function createVoiceAIError(code: keyof typeof ERROR_CODES, details?: any): VoiceAIError {
  return new VoiceAIError(ERROR_MESSAGES[code], code, details);
}

export function handleGoogleCloudError(error: any): VoiceAIError {
  console.error('Google Cloud error:', error);
  
  if (error.code === 7) {
    return createVoiceAIError(ERROR_CODES.MICROPHONE_ACCESS_DENIED);
  }
  
  if (error.code === 3) {
    return createVoiceAIError(ERROR_CODES.INVALID_AUDIO_FORMAT);
  }
  
  if (error.code === 14) {
    return createVoiceAIError(ERROR_CODES.NETWORK_ERROR);
  }
  
  return createVoiceAIError(ERROR_CODES.GOOGLE_CLOUD_ERROR, error);
}

export function handleMediaRecorderError(error: any): VoiceAIError {
  console.error('MediaRecorder error:', error);
  
  if (error.name === 'NotAllowedError') {
    return createVoiceAIError(ERROR_CODES.MICROPHONE_ACCESS_DENIED);
  }
  
  if (error.name === 'NotFoundError') {
    return createVoiceAIError(ERROR_CODES.RECORDING_FAILED);
  }
  
  return createVoiceAIError(ERROR_CODES.RECORDING_FAILED, error);
}

export function handleNetworkError(error: any): VoiceAIError {
  console.error('Network error:', error);
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return createVoiceAIError(ERROR_CODES.NETWORK_ERROR);
  }
  
  return createVoiceAIError(ERROR_CODES.NETWORK_ERROR, error);
}

export class ErrorBoundary {
  private static instance: ErrorBoundary;
  private errorCallbacks: Array<(error: VoiceAIError) => void> = [];

  static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  addErrorCallback(callback: (error: VoiceAIError) => void): void {
    this.errorCallbacks.push(callback);
  }

  removeErrorCallback(callback: (error: VoiceAIError) => void): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  handleError(error: any): void {
    let voiceAIError: VoiceAIError;
    
    if (error instanceof VoiceAIError) {
      voiceAIError = error;
    } else if (error.code && typeof error.code === 'number') {
      voiceAIError = handleGoogleCloudError(error);
    } else if (error.name && (error.name === 'NotAllowedError' || error.name === 'NotFoundError')) {
      voiceAIError = handleMediaRecorderError(error);
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      voiceAIError = handleNetworkError(error);
    } else {
      voiceAIError = createVoiceAIError(ERROR_CODES.NETWORK_ERROR, error);
    }

    this.errorCallbacks.forEach(callback => callback(voiceAIError));
  }
}