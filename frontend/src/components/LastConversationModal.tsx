import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RotateCcw, Volume2 } from 'lucide-react';
import { TranscriptUtterance } from '../types/transcription';

interface LastConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  utterances: TranscriptUtterance[];
  fontSize: 'normal' | 'large' | 'huge';
}

const SPEAKER_STYLES = [
  {
    bg: 'bg-sky-950/90',
    border: 'border-sky-400',
    badge: 'bg-sky-600 text-slate-950',
  },
  {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-400',
    badge: 'bg-emerald-500 text-slate-950',
  },
  {
    bg: 'bg-amber-950/90',
    border: 'border-amber-400',
    badge: 'bg-amber-400 text-slate-950',
  },
  {
    bg: 'bg-purple-950/90',
    border: 'border-purple-400',
    badge: 'bg-purple-400 text-slate-950',
  },
];

export const LastConversationModal: React.FC<LastConversationModalProps> = ({
  isOpen,
  onClose,
  utterances,
  fontSize,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom immediately when opened so the user visualizes the end of the conversation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'auto' });
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, utterances]);

  if (!isOpen) return null;

  const textClass =
    fontSize === 'huge'
      ? 'text-3xl sm:text-4xl md:text-5xl leading-relaxed font-bold'
      : fontSize === 'large'
      ? 'text-2xl sm:text-3xl md:text-4xl leading-relaxed font-semibold'
      : 'text-xl sm:text-2xl md:text-3xl leading-relaxed font-medium';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/40">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {t('lastConversationModal.title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {t('lastConversationModal.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('lastConversationModal.close')}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500 transition cursor-pointer"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Conversation Stream (scrollable, starts scrolled to the bottom) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {utterances.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Volume2 className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-xl sm:text-2xl font-bold text-slate-300">
                {t('lastConversationModal.empty')}
              </p>
            </div>
          ) : (
            utterances.map((u) => {
              const isOwner = u.speaker === 0;
              const style = SPEAKER_STYLES[u.speaker % SPEAKER_STYLES.length];
              return (
                <article
                  key={u.id}
                  className={`w-full rounded-3xl p-5 sm:p-7 border-3 shadow-xl ${style.bg} ${style.border}`}
                >
                  <div className="flex items-center pb-3 mb-2 border-b border-white/10 select-none">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-sm sm:text-base ${style.badge}`}
                    >
                      <span>
                        {isOwner
                          ? `${t('transcript.speaker', { number: 0 })} (${t('fingerprint.ownerBadge')})`
                          : t('transcript.speaker', { number: u.speaker })}
                      </span>
                    </span>
                  </div>
                  <p dir="auto" className={`text-white tracking-wide ${textClass}`}>
                    {u.text}
                  </p>
                </article>
              );
            })
          )}
          <div ref={bottomRef} className="h-2" />
        </div>

        {/* Footer with large close button */}
        <div className="p-4 border-t border-slate-700 bg-slate-900 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg sm:text-xl rounded-2xl transition cursor-pointer"
          >
            {t('lastConversationModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
