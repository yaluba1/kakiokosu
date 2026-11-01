import { DeepgramWord } from '../types/transcription';

/**
 * Removes isolated 1-word speaker glitches (e.g. Speaker 0 -> Speaker 1 -> Speaker 0
 * for a duration under 0.45 seconds).
 */
export function smoothWordSpeakers(words: DeepgramWord[]): DeepgramWord[] {
  if (words.length < 3) return words;
  const smoothed = words.map((w) => ({ ...w }));

  for (let i = 1; i < smoothed.length - 1; i++) {
    const prevSpk = smoothed[i - 1].speaker ?? 0;
    const currSpk = smoothed[i].speaker ?? 0;
    const nextSpk = smoothed[i + 1].speaker ?? 0;

    if (currSpk !== prevSpk && prevSpk === nextSpk) {
      const dur = (smoothed[i].end ?? 0) - (smoothed[i].start ?? 0);
      if (dur < 0.45) {
        smoothed[i].speaker = prevSpk;
      }
    }
  }

  return smoothed;
}

/**
 * Concatenates words intelligently, omitting spaces between CJK characters (Japanese, Chinese)
 * while preserving standard whitespace for alphabetic languages.
 */
export function joinWordsRespectingLanguage(words: string[]): string {
  if (words.length === 0) return '';
  let result = words[0];

  for (let i = 1; i < words.length; i++) {
    const prevChar = result.slice(-1);
    const nextChar = words[i].charAt(0);

    const isPrevCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(prevChar);
    const isNextCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(nextChar);

    if (isPrevCjk || isNextCjk) {
      result += words[i];
    } else {
      result += ' ' + words[i];
    }
  }

  return result;
}

/**
 * Groups consecutive words by speaker ID into unified transcript blocks.
 * If all words in the block belong to a single speaker and an original full transcript
 * is provided, it uses the original full transcript to retain Deepgram's Smart Formatting.
 */
export function groupWordsBySpeaker(
  words: DeepgramWord[],
  fallbackTranscript?: string
): Array<{
  speaker: number;
  transcript: string;
  startSec?: number;
  endSec?: number;
}> {
  if (words.length === 0) {
    if (fallbackTranscript && fallbackTranscript.trim().length > 0) {
      return [
        {
          speaker: 0,
          transcript: fallbackTranscript.trim(),
        },
      ];
    }
    return [];
  }

  const smoothed = smoothWordSpeakers(words);
  const firstSpeaker = smoothed[0].speaker ?? 0;
  const isSingleSpeaker = smoothed.every((w) => (w.speaker ?? 0) === firstSpeaker);

  // If entire utterance is from one speaker, preserve Deepgram's exact Smart Formatting
  if (isSingleSpeaker && fallbackTranscript && fallbackTranscript.trim().length > 0) {
    return [
      {
        speaker: firstSpeaker,
        transcript: fallbackTranscript.trim(),
        startSec: smoothed[0].start,
        endSec: smoothed[smoothed.length - 1].end,
      },
    ];
  }

  const blocks: Array<{
    speaker: number;
    transcript: string;
    startSec: number;
    endSec: number;
  }> = [];

  let currentSpeaker: number | null = null;
  let currentWords: string[] = [];
  let startSec = 0;
  let endSec = 0;

  for (const wordObj of smoothed) {
    const spk = wordObj.speaker ?? 0;
    const text = wordObj.punctuated_word || wordObj.word;

    if (currentSpeaker === null) {
      currentSpeaker = spk;
      startSec = wordObj.start;
      endSec = wordObj.end;
      currentWords = [text];
    } else if (currentSpeaker === spk) {
      currentWords.push(text);
      endSec = wordObj.end;
    } else {
      blocks.push({
        speaker: currentSpeaker,
        transcript: joinWordsRespectingLanguage(currentWords),
        startSec,
        endSec,
      });
      currentSpeaker = spk;
      startSec = wordObj.start;
      endSec = wordObj.end;
      currentWords = [text];
    }
  }

  if (currentSpeaker !== null && currentWords.length > 0) {
    blocks.push({
      speaker: currentSpeaker,
      transcript: joinWordsRespectingLanguage(currentWords),
      startSec,
      endSec,
    });
  }

  return blocks;
}

