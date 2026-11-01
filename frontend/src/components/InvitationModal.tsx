import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mail, Copy, Check, Sparkles, Send } from 'lucide-react';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONTACT_EMAIL = 'kakiokoshi@yaluba.com';

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  const mailSubject = encodeURIComponent(t('invitationModal.mailSubject'));
  const mailBody = encodeURIComponent(t('invitationModal.mailBody'));
  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-slate-700 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {t('invitationModal.title')}
              </h2>
              <p className="text-slate-400 text-sm sm:text-base mt-1">
                {t('invitationModal.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('invitationModal.close')}
            className="p-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500 transition shrink-0 ml-2"
          >
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4 text-slate-200">
          <p className="text-base sm:text-lg leading-relaxed whitespace-pre-line text-slate-300">
            {t('invitationModal.description')}
          </p>

          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-600/60 text-sky-100">
            <p className="text-base sm:text-lg leading-relaxed font-medium">
              {t('invitationModal.actionNote')}
            </p>
          </div>

          {/* Email card */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Mail className="w-4 h-4 text-sky-400" />
              <span>{t('invitationModal.emailLabel')}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="font-mono text-lg sm:text-xl font-bold text-white select-all break-all">
                {CONTACT_EMAIL}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    <span className="text-emerald-300">{t('invitationModal.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>{t('invitationModal.copyEmail')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <a
            href={mailtoUrl}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-base sm:text-lg rounded-2xl shadow-lg transition active:scale-[0.99] text-center"
          >
            <Send className="w-5 h-5" />
            <span>{t('invitationModal.sendEmail')}</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base sm:text-lg transition"
          >
            {t('invitationModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

