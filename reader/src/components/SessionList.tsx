import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionSummary } from '../api/client';
import { Search, Calendar, MessageSquare, Clock, Filter, RefreshCw } from 'lucide-react';

interface SessionListProps {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelectSession: (session: SessionSummary) => void;
  isAdmin: boolean;
  filterUserId: string;
  onChangeFilterUserId: (val: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  isAdmin,
  filterUserId,
  onChangeFilterUserId,
  onRefresh,
  isLoading,
}) => {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      s.user_id.toLowerCase().includes(term) ||
      s.language.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full md:w-96 flex flex-col h-full bg-slate-800/60 border-e border-slate-700">
      {/* Top Controls */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-sm">
            {t('sessionList.title', { count: sessions.length })}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
            title={t('sessionList.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Admin filter by User ID */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <Filter className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              placeholder={t('sessionList.adminFilterPlaceholder')}
              value={filterUserId}
              onChange={(e) => onChangeFilterUserId(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
            />
            {filterUserId && (
              <button
                onClick={() => onChangeFilterUserId('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Local Search Input */}
        <div className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-700">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t('sessionList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
          />
        </div>
      </div>

      {/* Session Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-750">
        {filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            {isLoading ? t('sessionList.loading') : t('sessionList.empty')}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = session.id === selectedSessionId;
            const startDate = new Date(session.started_at);
            const dateStr = startDate.toLocaleDateString(i18n.language, {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            });
            const timeStr = startDate.toLocaleTimeString(i18n.language, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session)}
                className={`w-full text-start p-4 transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-sky-950/60 border-s-4 border-sky-400'
                    : 'hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Calendar className="w-3.5 h-3.5" />
                    {dateStr} {timeStr}
                  </span>
                  <span className="uppercase px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-bold text-slate-300">
                    {session.language}
                  </span>
                </div>

                {isAdmin && (
                  <div className="text-[11px] font-mono text-amber-300/80 truncate">
                    User: {session.user_id}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    {t('sessionList.segmentsCount', { count: session.segment_count })}
                  </span>
                  {session.ended_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t('sessionList.durationMinutes', {
                        minutes: Math.max(1, Math.round((session.ended_at - session.started_at) / 60000)),
                      })}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
