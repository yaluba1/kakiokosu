import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthGuard } from './components/AuthGuard';
import { Navbar } from './components/Navbar';
import { SessionList } from './components/SessionList';
import { SessionDetail } from './components/SessionDetail';
import { LanguageModal } from './components/LanguageModal';
import { useAuthSession } from './hooks/useAuthSession';
import { fetchSessions, fetchSessionDetail, SessionSummary, Segment } from './api/client';
import { DEFAULT_LANGUAGE } from './constants/languages';

export function ReaderContent() {
  const { i18n } = useTranslation();
  const { token, profile, logout } = useAuthSession();

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('kakiokoshi_language') || localStorage.getItem('kakiokosu_language') || i18n.language || DEFAULT_LANGUAGE;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);

  // Admin filter by target user ID
  const [filterUserId, setFilterUserId] = useState('');
  const [includeMuted, setIncludeMuted] = useState(true);

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    localStorage.setItem('kakiokoshi_language', code);
    i18n.changeLanguage(code);
  };

  // Load sessions list
  const loadSessions = useCallback(async () => {
    if (!token) return;
    setIsLoadingSessions(true);
    try {
      const data = await fetchSessions(token, {
        targetUserId: profile?.isAdmin ? filterUserId || undefined : undefined,
      });
      setSessions(data.sessions);
      setSelectedSession((prev) => prev || (data.sessions.length > 0 ? data.sessions[0] : null));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [token, profile?.isAdmin, filterUserId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load segments when selectedSession or includeMuted changes
  useEffect(() => {
    if (!token || !selectedSession) {
      setSegments([]);
      return;
    }

    let isMounted = true;
    setIsLoadingSegments(true);
    fetchSessionDetail(token, selectedSession.id, includeMuted)
      .then((data) => {
        if (isMounted) {
          setSegments(data.segments);
        }
      })
      .catch((err) => {
        console.error('Failed to load session detail:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSegments(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, selectedSession, includeMuted]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100">
      <Navbar
        profile={profile}
        onLogout={logout}
        selectedLanguage={selectedLanguage}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <SessionList
          sessions={sessions}
          selectedSessionId={selectedSession?.id || null}
          onSelectSession={setSelectedSession}
          isAdmin={profile?.isAdmin || false}
          filterUserId={filterUserId}
          onChangeFilterUserId={setFilterUserId}
          onRefresh={loadSessions}
          isLoading={isLoadingSessions}
        />

        <SessionDetail
          session={selectedSession}
          segments={segments}
          isLoading={isLoadingSegments}
          includeMuted={includeMuted}
          onToggleIncludeMuted={() => setIncludeMuted((prev) => !prev)}
        />
      </div>

      <LanguageModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <ReaderContent />
    </AuthGuard>
  );
}
