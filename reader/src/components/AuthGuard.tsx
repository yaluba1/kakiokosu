import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { useAuthSession } from '../hooks/useAuthSession';
import { BookOpen, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { LanguageModal } from './LanguageModal';
import { InvitationModal } from './InvitationModal';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../constants/languages';

interface AuthGuardProps {
  children: React.ReactNode;
}

type AuthMode = 'signin' | 'reset';

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthSession();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isInvitationOpen, setIsInvitationOpen] = useState(false);

  const savedLang = localStorage.getItem('kakiokoshi_language') || localStorage.getItem('kakiokosu_language');
  const activeLangCode = savedLang && savedLang !== 'guess'
    ? savedLang
    : (i18n.language || DEFAULT_LANGUAGE);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === activeLangCode)
    || SUPPORTED_LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE);

  const handleSelectLanguage = (code: string) => {
    localStorage.setItem('kakiokoshi_language', code);
    i18n.changeLanguage(code);
  };

  const getLocalizedError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return t('auth.errors.invalidCredential');
      case 'auth/email-already-in-use':
        return t('auth.errors.emailInUse');
      case 'auth/weak-password':
        return t('auth.errors.weakPassword');
      case 'auth/invalid-email':
        return t('auth.errors.invalidEmail');
      case 'auth/too-many-requests':
        return t('auth.errors.tooManyRequests');
      default:
        return t('auth.errors.generic');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setErrorMsg(null);
    setResetSent(false);
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setResetSent(true);
      }
    } catch (err) {
      setErrorMsg(getLocalizedError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setResetSent(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400 mb-4"></div>
        <p className="text-xl font-bold">{t('auth.loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen max-h-screen overflow-y-auto bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl my-auto">
          {/* Language Selector */}
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setIsLangModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400"
              aria-label={t('navbar.languageSelect')}
              title={t('navbar.languageSelect')}
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>{currentLang?.nativeName || currentLang?.name || activeLangCode}</span>
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 mb-3 border border-sky-500/30">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {t('auth.title')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('auth.subtitle')}
            </p>
          </div>

          {!isFirebaseConfigured ? (
            <div className="p-4 bg-amber-950/60 border border-amber-600 rounded-xl text-amber-200 text-center text-sm">
              {t('auth.envError')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-200 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {resetSent && (
                <div className="flex items-start gap-2.5 p-3.5 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-200 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{t('auth.resetEmailSent')}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="reader-auth-email"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  {t('auth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reader-auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <label
                    htmlFor="reader-auth-password"
                    className="block text-sm font-medium text-slate-300 mb-1.5"
                  >
                    {t('auth.passwordLabel')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reader-auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-sky-400 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 font-bold text-sm rounded-xl shadow transition"
              >
                {isSubmitting
                  ? t('auth.submitting')
                  : mode === 'signin'
                  ? t('auth.signInButton')
                  : t('auth.resetPasswordButton')}
              </button>

              <div className="pt-2 flex flex-col gap-2 text-center">
                {mode === 'signin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsInvitationOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 py-1 transition"
                    >
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <span>{t('auth.requestInvitation')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-slate-400 hover:text-slate-200 py-1 transition"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </>
                )}

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs font-medium text-sky-400 hover:text-sky-300 py-1 transition"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Language Selection Modal */}
        <LanguageModal
          isOpen={isLangModalOpen}
          onClose={() => setIsLangModalOpen(false)}
          selectedLanguage={activeLangCode}
          onSelectLanguage={handleSelectLanguage}
        />

        {/* Invitation Request Modal */}
        <InvitationModal
          isOpen={isInvitationOpen}
          onClose={() => setIsInvitationOpen(false)}
        />
      </div>
    );
  }

  return <>{children}</>;
};
