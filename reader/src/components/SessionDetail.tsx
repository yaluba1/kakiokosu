import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionSummary, Segment } from '../api/client';
import { Download, Eye, EyeOff, VolumeX, MessageSquare } from 'lucide-react';

interface SessionDetailProps {
  session: SessionSummary | null;
  segments: Segment[];
  isLoading: boolean;
  includeMuted: boolean;
  onToggleIncludeMuted: () => void;
}

const SPEAKER_COLORS = [
  'bg-sky-500/20 text-sky-300 border-sky-500/40',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'bg-purple-500/20 text-purple-300 border-purple-500/40',
];

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  segments,
  isLoading,
  includeMuted,
  onToggleIncludeMuted,
}) => {
  const { t, i18n } = useTranslation();
  const [filterText, setFilterText] = useState('');

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <MessageSquare className="w-12 h-12 mb-3 text-slate-600" />
        <p className="text-lg font-medium text-slate-400">
          {t('sessionDetail.noSessionTitle')}
        </p>
        <p className="text-sm mt-1">
          {t('sessionDetail.noSessionDesc')}
        </p>
      </div>
    );
  }

  const handleExportTxt = () => {
    const lines = segments.map((s) => {
      const time = new Date(s.created_at).toLocaleTimeString(i18n.language);
      const mutedTag = s.is_muted ? ` ${t('export.mutedTag')}` : '';
      return `[${time}] ${t('export.speakerPrefix', { number: s.speaker })}${mutedTag}: ${s.transcript}`;
    });

    const header = `${t('export.sessionHeader', { id: session.id })}\n${t('export.dateHeader', {
      date: new Date(session.started_at).toLocaleString(i18n.language),
    })}\n${t('export.languageHeader', { language: session.language })}\n${t('export.userHeader', {
      userId: session.user_id,
    })}\n\n`;

    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${session.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSegments = segments.filter((seg) => {
    if (!filterText) return true;
    return seg.transcript.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Session Top Bar */}
      <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {t('sessionDetail.title')}
            </h2>
            <span className="font-mono text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {session.id.slice(0, 8)}...
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(session.started_at).toLocaleString(i18n.language)} • {t('sessionDetail.languageLabel', { language: session.language })} • {t('sessionDetail.segmentsLabel', { count: segments.length })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Toggle Muted Visibility */}
          <button
            onClick={onToggleIncludeMuted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              includeMuted
                ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                : 'bg-slate-700 border-slate-600 text-slate-300'
            }`}
          >
            {includeMuted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>
              {includeMuted ? t('sessionDetail.mutedVisible') : t('sessionDetail.mutedHidden')}
            </span>
          </button>

          {/* Export TXT */}
          <button
            onClick={handleExportTxt}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('sessionDetail.exportTxt')}</span>
          </button>
        </div>
      </div>

      {/* Segments Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            {t('sessionDetail.loading')}
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {t('sessionDetail.empty')}
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const speakerColor = SPEAKER_COLORS[seg.speaker % SPEAKER_COLORS.length];
            const timeStr = new Date(seg.created_at).toLocaleTimeString(i18n.language, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={seg.id}
                className={`p-4 rounded-xl border transition ${
                  seg.is_muted
                    ? 'bg-slate-800/40 border-slate-700/60 opacity-60'
                    : 'bg-slate-800 border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-bold border ${speakerColor}`}>
                      {t('sessionDetail.speaker', { number: seg.speaker })}
                    </span>
                    {seg.is_muted === 1 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700/50">
                        <VolumeX className="w-3 h-3" />
                        {t('sessionDetail.mutedTag')}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{timeStr}</span>
                </div>
                <p dir="auto" className="text-slate-100 text-base leading-relaxed tracking-wide select-text">
                  {seg.transcript}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
