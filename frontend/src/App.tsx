import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthGuard } from './components/AuthGuard';
import { Header } from './components/Header';
import { MutedSpeakersBar } from './components/MutedSpeakersBar';
import { TranscriptView } from './components/TranscriptView';
import { FullscreenSessionControls } from './components/FullscreenSessionControls';
import { LanguageModal } from './components/LanguageModal';
import { LastConversationModal } from './components/LastConversationModal';
import { useAuthSession } from './hooks/useAuthSession';
import { useTranscription } from './hooks/useTranscription';
import { FingerprintProvider, useFingerprint } from './context/FingerprintContext';
import { DEFAULT_LANGUAGE } from './constants/languages';
import { TranscriptUtterance } from './types/transcription';
import {
  getLastConversationStorageKey,
  clearLastConversation,
  LAST_CONVERSATION_STORAGE_KEY,
  LEGACY_LAST_CONVERSATION_STORAGE_KEY,
} from './utils/storage';

const WORKER_WS_URL =
  import.meta.env.VITE_WORKER_WS_URL || 'ws://localhost:8787';

const enterFullscreen = async () => {
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
    }
  } catch {
    // Fullscreen may not be supported or permitted on this browser/device
  }
};

const exitFullscreen = async () => {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    mozCancelFullScreen?: () => Promise<void> | void;
    msExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  };
  try {
    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (isFullscreen) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch {
    // Ignore errors on exit
  }
};

export function AppContent() {
  const { i18n } = useTranslation();
  const { token, user, logout } = useAuthSession();
  const { clearFingerprint } = useFingerprint();

  // Reset scroll offset on mount (e.g. after login keyboard dismissed in mobile browsers)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Persist language selection in localStorage
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('kakiokoshi_language') || localStorage.getItem('kakiokosu_language') || i18n.language || DEFAULT_LANGUAGE;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLastConversationOpen, setIsLastConversationOpen] = useState(false);

  // Persist and load the last conversation so users can read it even if the session closed abruptly
  const [lastConversation, setLastConversation] = useState<TranscriptUtterance[]>(() => {
    try {
      const userKey = user?.id ? `kakiokoshi_last_conversation_${user.id}` : null;
      const saved =
        (userKey ? localStorage.getItem(userKey) : null) ||
        localStorage.getItem(LAST_CONVERSATION_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_LAST_CONVERSATION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Re-sync conversation when user changes
  useEffect(() => {
    if (user?.id) {
      try {
        const userKey = `kakiokoshi_last_conversation_${user.id}`;
        const saved =
          localStorage.getItem(userKey) ||
          localStorage.getItem(LAST_CONVERSATION_STORAGE_KEY) ||
          localStorage.getItem(LEGACY_LAST_CONVERSATION_STORAGE_KEY);
        setLastConversation(saved ? JSON.parse(saved) : []);
      } catch {
        setLastConversation([]);
      }
    } else {
      setLastConversation([]);
    }
  }, [user?.id]);

  // Font size setting for reading comfort: normal | large | huge
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>(() => {
    return (
      (localStorage.getItem('kakiokoshi_fontsize') as 'normal' | 'large' | 'huge') ||
      (localStorage.getItem('kakiokosu_fontsize') as 'normal' | 'large' | 'huge') ||
      'large'
    );
  });

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    localStorage.setItem('kakiokoshi_language', code);
    if (code !== 'guess') {
      i18n.changeLanguage(code);
    } else {
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
      i18n.changeLanguage(browserLang || DEFAULT_LANGUAGE);
    }
  };

  const handleChangeFontSize = (size: 'normal' | 'large' | 'huge') => {
    setFontSize(size);
    localStorage.setItem('kakiokoshi_fontsize', size);
  };

  const {
    isRecording,
    utterances,
    interimText,
    interimSpeaker,
    mutedSpeakers,
    statusCode,
    startRecording,
    stopRecording,
    toggleMuteSpeaker,
    unmuteSpeaker,
    clearAllMuted,
  } = useTranscription({
    workerWsUrl: WORKER_WS_URL,
    token,
    language: selectedLanguage,
  });

  // Re-connect if language changes during active recording
  useEffect(() => {
    if (isRecording) {
      stopRecording();
      const timer = setTimeout(() => {
        startRecording();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save utterances to lastConversation in real-time so that if the session closes
  // unexpectedly (screen turns off, wrong button, backgrounded), the user can always read it.
  useEffect(() => {
    if (utterances.length > 0) {
      setLastConversation(utterances);
      try {
        const storageKey = getLastConversationStorageKey(user?.id);
        localStorage.setItem(storageKey, JSON.stringify(utterances));
      } catch (e) {
        console.warn('Failed to save last conversation to localStorage:', e);
      }
    }
  }, [utterances, user?.id]);

  const handleStartSession = () => {
    enterFullscreen();
    startRecording();
  };

  const handleStopSession = useCallback(() => {
    stopRecording();
    exitFullscreen();
  }, [stopRecording]);

  // Exit fullscreen whenever a session ends
  useEffect(() => {
    if (!isRecording) {
      exitFullscreen();
    }
  }, [isRecording]);

  // When the user exits fullscreen by any means (e.g. Samsung/Android back gesture,
  // hardware back button, Esc key, browser controls), also immediately stop the session.
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      if (!isFullscreen && isRecording) {
        stopRecording();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isRecording, stopRecording]);

  const handleLogout = async () => {
    if (isRecording) {
      stopRecording();
    }
    // Prevent shared-device privacy leakage by clearing cached transcripts and voiceprints
    setLastConversation([]);
    clearLastConversation(user?.id);
    clearFingerprint();
    await logout();
  };

  // During active session, block arbitrary keyboard keys (allow Escape to stop),
  // and prevent context menu or text selection during touch-and-hold gestures.
  useEffect(() => {
    if (!isRecording) return;

    // Allow Escape key to stop session & exit fullscreen, block other keys
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleStopSession();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent mobile long-press context menu and accidental text selection
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    const keyEvents = ['keydown', 'keyup', 'keypress'] as const;
    keyEvents.forEach((type) => {
      window.addEventListener(type, handleKey, { capture: true });
    });

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('selectstart', handleSelectStart, { capture: true });

    return () => {
      keyEvents.forEach((type) => {
        window.removeEventListener(type, handleKey, { capture: true });
      });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('selectstart', handleSelectStart, { capture: true });
    };
  }, [isRecording, handleStopSession]);

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Header - Hidden during ongoing session so transcription covers the whole window */}
      {!isRecording && (
        <Header
          isRecording={isRecording}
          selectedLanguage={selectedLanguage}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLastConversation={() => setIsLastConversationOpen(true)}
          hasLastConversation={lastConversation.length > 0}
          fontSize={fontSize}
          onChangeFontSize={handleChangeFontSize}
          onLogout={handleLogout}
          statusCode={statusCode}
        />
      )}

      {/* Muted Speakers Bar - Shown whenever any speaker is muted so user can unmute at any time */}
      <MutedSpeakersBar
        mutedSpeakers={mutedSpeakers}
        onUnmute={unmuteSpeaker}
        onClearAll={clearAllMuted}
      />

      {/* Main Conversation Stream - Covers whole screen/window during session */}
      <TranscriptView
        utterances={utterances}
        interimText={interimText}
        interimSpeaker={interimSpeaker}
        mutedSpeakers={mutedSpeakers}
        onToggleMuteSpeaker={toggleMuteSpeaker}
        fontSize={fontSize}
        isRecording={isRecording}
        onStartSession={handleStartSession}
      />

      {/* Floating Stop Button & 3-Second Screen Hold Exit Controls during active session */}
      <FullscreenSessionControls
        isRecording={isRecording}
        onStopSession={handleStopSession}
      />

      {/* Language Selection Modal */}
      <LanguageModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* Last Conversation Review Modal */}
      <LastConversationModal
        isOpen={isLastConversationOpen}
        onClose={() => setIsLastConversationOpen(false)}
        utterances={lastConversation}
        fontSize={fontSize}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <FingerprintProvider>
        <AppContent />
      </FingerprintProvider>
    </AuthGuard>
  );
}
