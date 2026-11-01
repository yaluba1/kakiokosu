import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { TranscriptionStatusCode } from '../hooks/useTranscription';
import { FingerprintButton } from './FingerprintButton';
import { HoldButton } from './HoldButton';
import { usePwaInstall } from '../hooks/usePwaInstall';

const InstallIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

interface HeaderProps {
  isRecording: boolean;
  selectedLanguage: string;
  onOpenSettings: () => void;
  onOpenLastConversation: () => void;
  hasLastConversation: boolean;
  fontSize: 'normal' | 'large' | 'huge';
  onChangeFontSize: (size: 'normal' | 'large' | 'huge') => void;
  onLogout: () => void;
  statusCode?: TranscriptionStatusCode;
  statusText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isRecording,
  selectedLanguage,
  onOpenSettings,
  onOpenLastConversation,
  hasLastConversation,
  fontSize,
  onChangeFontSize,
  onLogout,
  statusCode,
  statusText,
}) => {
  const { t } = useTranslation();
  const { canInstall, isStandalone, isIOS, promptInstall } = usePwaInstall();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);

  const toggleFontSize = () => {
    if (fontSize === 'normal') onChangeFontSize('large');
    else if (fontSize === 'large') onChangeFontSize('huge');
    else onChangeFontSize('normal');
  };

  const getStatusDisplay = () => {
    if (statusCode) {
      return t(`header.status.${statusCode}`);
    }
    if (statusText && statusText.startsWith('header.status.')) {
      return t(statusText);
    }
    return isRecording ? t('header.status.listening') : t('header.status.idle');
  };

  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 'normal':
        return t('header.fontSize.normal');
      case 'large':
        return t('header.fontSize.large');
      case 'huge':
        return t('header.fontSize.huge');
    }
  };

  return (
    <header className="bg-slate-900 border-b-2 border-slate-700 px-4 py-3 sm:py-4 flex items-center justify-between gap-3 shadow-lg select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
            {t('app.title')}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                isRecording
                  ? 'bg-rose-500 animate-pulse ring-4 ring-rose-500/30'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-300">
              {getStatusDisplay()}
            </span>
          </div>
        </div>
      </div>

      {/* Settings & Font Size Controls */}
      <div className="flex items-center gap-2">
        {/* Owner Voice Fingerprint button (long-press > 2s to set/change/remove) */}
        <FingerprintButton disabled={isRecording} />

        {/* Last conversation button (hold >= 1s) */}
        <HoldButton
          onHoldComplete={onOpenLastConversation}
          holdDurationMs={1000}
          disabled={isRecording}
          hintText={t('header.holdHint')}
          title={t('header.lastConversation')}
          className={`p-2.5 sm:p-3 bg-slate-800 border border-slate-600 rounded-2xl flex items-center gap-1.5 font-bold text-sm transition ${
            isRecording
              ? 'opacity-30 cursor-not-allowed pointer-events-none'
              : hasLastConversation
              ? 'text-sky-300 hover:bg-slate-700 hover:text-sky-200 cursor-pointer'
              : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 cursor-pointer'
          }`}
        >
          <RotateCcw className="w-5 h-5 text-sky-400" />
          <span className="hidden sm:inline">
            {t('header.lastConversation')}
          </span>
        </HoldButton>

        {/* Font size cycler (hold >= 1s) */}
        <HoldButton
          onHoldComplete={toggleFontSize}
          holdDurationMs={1000}
          disabled={isRecording}
          hintText={t('header.holdHint')}
          title={t('header.fontSize.label')}
          className={`p-2.5 sm:p-3 bg-slate-800 border border-slate-600 text-slate-200 rounded-2xl flex items-center gap-1 font-bold text-sm transition ${
            isRecording
              ? 'opacity-30 cursor-not-allowed pointer-events-none'
              : 'hover:bg-slate-700 cursor-pointer'
          }`}
        >
          {fontSize === 'normal' && <ZoomIn className="w-5 h-5 text-sky-400" />}
          {fontSize === 'large' && <ZoomIn className="w-6 h-6 text-amber-400" />}
          {fontSize === 'huge' && <ZoomOut className="w-6 h-6 text-rose-400" />}
          <span className="hidden sm:inline">
            {getFontSizeLabel()}
          </span>
        </HoldButton>

        {/* Language selector modal button (hold >= 1s) */}
        <HoldButton
          onHoldComplete={onOpenSettings}
          holdDurationMs={1000}
          disabled={isRecording}
          hintText={t('header.holdHint')}
          title={t('header.languageSelect')}
          className={`p-2.5 sm:p-3 bg-slate-800 border border-slate-600 text-slate-200 rounded-2xl flex items-center gap-1.5 font-bold text-sm transition ${
            isRecording
              ? 'opacity-30 cursor-not-allowed pointer-events-none'
              : 'hover:bg-slate-700 cursor-pointer'
          }`}
        >
          <Globe className="w-5 h-5 text-sky-400" />
          <span className="hidden md:inline font-semibold text-slate-300">
            {currentLang?.nativeName || currentLang?.name || t('header.languageSelect')}
          </span>
        </HoldButton>

        {/* Install PWA Button (Android / Chromium / Desktop - hold >= 1s) */}
        {!isStandalone && canInstall && (
          <HoldButton
            onHoldComplete={promptInstall}
            holdDurationMs={1000}
            disabled={isRecording}
            hintText={t('header.holdHint')}
            title="アプリをインストール / Install App"
            className="p-2.5 sm:p-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl flex items-center gap-1.5 font-bold text-sm shadow-md transition animate-pulse cursor-pointer"
          >
            <InstallIcon className="w-5 h-5 text-white" />
            <span className="hidden sm:inline">Install</span>
          </HoldButton>
        )}

        {/* Install PWA Guide for iOS Safari (hold >= 1s) */}
        {!isStandalone && isIOS && !canInstall && (
          <HoldButton
            onHoldComplete={() => setShowIOSPrompt(true)}
            holdDurationMs={1000}
            disabled={isRecording}
            hintText={t('header.holdHint')}
            title="ホーム画面に追加 / Add to Home Screen"
            className="p-2.5 sm:p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sky-400 rounded-2xl flex items-center gap-1.5 font-bold text-sm transition cursor-pointer"
          >
            <InstallIcon className="w-5 h-5" />
          </HoldButton>
        )}

        {/* Logout - hold >= 3s to sign out */}
        <HoldButton
          data-logout-button="true"
          onHoldComplete={onLogout}
          holdDurationMs={3000}
          hintText={t('header.logoutHoldHint')}
          progressBarColor="bg-rose-500"
          hintClassName="border-rose-400/70 text-rose-200"
          title={t('header.logout')}
          className="p-2.5 sm:p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-rose-400 rounded-2xl transition cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </HoldButton>
      </div>

      {/* iOS Safari PWA Install Instructions Modal */}
      {showIOSPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSPrompt(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <InstallIcon className="w-5 h-5 text-sky-400" />
                アプリとしてインストール
              </h3>
              <button
                onClick={() => setShowIOSPrompt(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Safariの下部メニューにある共有ボタン <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">⎋</span> をタップし、
              <strong className="text-white">「ホーム画面に追加」</strong> を選択すると、通常のアプリとしてインストールできます。
            </p>
            <p className="text-slate-400 text-xs">
              Tap the <strong>Share</strong> button in Safari, then tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
            </p>
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition"
            >
              閉じる / Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
