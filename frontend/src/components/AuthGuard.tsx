import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { useAuthSession } from '../hooks/useAuthSession';
import { Ear, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Globe, Sparkles } from 'lucide-react';
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
    if (code !== 'guess') {
      i18n.changeLanguage(code);
    } else {
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
      i18n.changeLanguage(browserLang || DEFAULT_LANGUAGE);
    }
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
      <div className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-400 mb-6"></div>
        <p className="text-2xl font-bold tracking-wide">{t('auth.loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen min-h-[100dvh] max-h-screen max-h-[100dvh] overflow-y-auto bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto">
          {/* Language Selector */}
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setIsLangModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-sky-500"
              aria-label={t('header.languageSelect')}
              title={t('header.languageSelect')}
            >
              <Globe className="w-5 h-5 text-sky-400" />
              <span>{currentLang?.nativeName || currentLang?.name || activeLangCode}</span>
            </button>
          </div>

          {/* Elderly-friendly brand banner */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sky-500/20 text-sky-400 mb-4 border-2 border-sky-400">
              <Ear className="w-12 h-12" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t('app.title')}
            </h1>
            <p className="text-slate-300 mt-2 text-base sm:text-lg">
              {t('app.subtitle')}
            </p>
          </div>

          {!isFirebaseConfigured ? (
            <div className="p-4 bg-amber-950/60 border border-amber-600 rounded-2xl text-amber-200 text-center">
              <p className="font-bold text-base">{t('auth.envError')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 bg-rose-950/80 border-2 border-rose-500 rounded-2xl text-rose-100">
                  <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-base font-bold leading-snug">{errorMsg}</p>
                </div>
              )}

              {resetSent && (
                <div className="flex items-start gap-3 p-4 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl text-emerald-100">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-base font-bold leading-snug">{t('auth.resetEmailSent')}</p>
                </div>
              )}

              {/* Email input */}
              <div>
                <label
                  htmlFor="frontend-auth-email"
                  className="block text-lg font-bold text-slate-200 mb-2"
                >
                  {t('auth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="frontend-auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-700 focus:border-sky-400 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password input (hidden in reset mode) */}
              {mode !== 'reset' && (
                <div>
                  <label
                    htmlFor="frontend-auth-password"
                    className="block text-lg font-bold text-slate-200 mb-2"
                  >
                    {t('auth.passwordLabel')}
                  </label>
                  <div className="relative">
                    <Lock className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="frontend-auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="w-full pl-12 pr-14 py-4 bg-slate-950 border-2 border-slate-700 focus:border-sky-400 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white rounded-xl transition"
                    >
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Primary submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 font-extrabold text-xl rounded-2xl shadow-lg transition active:scale-[0.99]"
              >
                {isSubmitting
                  ? t('auth.submitting')
                  : mode === 'signin'
                  ? t('auth.signInButton')
                  : t('auth.resetPasswordButton')}
              </button>

              {/* Mode switch links */}
              <div className="pt-2 flex flex-col gap-3 text-center">
                {mode === 'signin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsInvitationOpen(true)}
                      className="inline-flex items-center justify-center gap-2 text-base font-bold text-sky-400 hover:text-sky-300 py-2 transition"
                    >
                      <Sparkles className="w-5 h-5 text-sky-400" />
                      <span>{t('auth.requestInvitation')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-sm font-medium text-slate-400 hover:text-slate-200 py-1 transition"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </>
                )}

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-base font-bold text-sky-400 hover:text-sky-300 py-2 transition"
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
          excludeGuess
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
