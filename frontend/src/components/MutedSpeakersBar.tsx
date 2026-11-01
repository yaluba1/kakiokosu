import React from 'react';
import { useTranslation } from 'react-i18next';
import { VolumeX, RotateCcw, Fingerprint } from 'lucide-react';
import { useFingerprint } from '../context/FingerprintContext';

interface MutedSpeakersBarProps {
  mutedSpeakers: number[];
  onUnmute: (speakerId: number) => void;
  onClearAll: () => void;
}

export const MutedSpeakersBar: React.FC<MutedSpeakersBarProps> = ({
  mutedSpeakers,
  onUnmute,
  onClearAll,
}) => {
  const { t } = useTranslation();
  const { ownerSpeakerId } = useFingerprint();

  if (mutedSpeakers.length === 0) return null;

  return (
    <aside
      data-muted-bar="true"
      aria-label={t('mutedBar.title')}
      className="bg-amber-950/80 border-b-2 border-amber-600/70 pl-4 pr-28 sm:pr-36 py-2.5 text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-md z-30"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <VolumeX className="w-6 h-6 text-amber-400 shrink-0" />
        <span className="font-bold text-lg">{t('mutedBar.title')}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {mutedSpeakers.map((spk) => {
            const isOwner = spk === 0 || (ownerSpeakerId !== null && spk === ownerSpeakerId);
            return (
              <button
                key={spk}
                onClick={() => onUnmute(spk)}
                title={t('mutedBar.unmuteHint')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 border border-amber-500 rounded-xl text-white font-bold hover:bg-amber-800 transition cursor-pointer"
              >
                {isOwner && <Fingerprint className="w-4 h-4 text-sky-400" />}
                <span>
                  {isOwner
                    ? `${t('mutedBar.speakerTag', { number: 0 })} (${t('fingerprint.ownerBadge')})`
                    : t('mutedBar.speakerTag', { number: spk })}
                </span>
                <span className="text-xs bg-amber-700 rounded-full px-1.5 py-0.5">{t('mutedBar.unmuteAction')}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-sm text-amber-300 underline font-semibold hover:text-white cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        <span>{t('mutedBar.showAll')}</span>
      </button>
    </aside>
  );
};
