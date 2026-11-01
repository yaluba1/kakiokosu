import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Shield, User, LogOut, Globe } from 'lucide-react';
import { MeResponse } from '../api/client';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

interface NavbarProps {
  profile: MeResponse | null;
  onLogout: () => void;
  selectedLanguage: string;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  onLogout,
  selectedLanguage,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between gap-4 shadow-sm select-none">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            {t('navbar.title')}
            {profile?.isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Shield className="w-3.5 h-3.5" />
                {t('navbar.adminBadge')}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">
            {t('navbar.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {profile && (
          <div
            title={`UID: ${profile.userId}`}
            className="hidden sm:flex items-center gap-2 text-sm text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-xs">{profile.email || profile.userId}</span>
          </div>
        )}

        {/* Language selector button */}
        <button
          onClick={onOpenSettings}
          title={t('navbar.languageSelect')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition"
        >
          <Globe className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">
            {currentLang?.nativeName || currentLang?.name || t('navbar.languageSelect')}
          </span>
        </button>

        {/* Logout button */}
        <button
          onClick={onLogout}
          title={t('navbar.logout')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('navbar.logout')}</span>
        </button>
      </div>
    </header>
  );
};
