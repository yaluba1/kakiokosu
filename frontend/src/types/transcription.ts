export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words?: DeepgramWord[];
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramResponse {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: DeepgramChannel;
  start?: number;
  duration?: number;
}

export interface TranscriptUtterance {
  id: string;
  speaker: number;
  rawSpeaker?: number;
  text: string;
  isFinal: boolean;
  startSec?: number;
  endSec?: number;
  timestamp: number;
}

