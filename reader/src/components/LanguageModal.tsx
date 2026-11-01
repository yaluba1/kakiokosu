import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../constants/languages';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelectLanguage: (code: string) => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {t('languageModal.title')}
            </h2>
            <p className="text-slate-400 text-base">
              {t('languageModal.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('languageModal.close')}
            className="p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Language List */}
        <div className="overflow-y-auto py-4 space-y-3 flex-1">
          {SUPPORTED_LANGUAGES.map((lang: LanguageOption) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-start border-2 transition-all ${
                  isSelected
                    ? 'bg-sky-950/80 border-sky-400 text-white shadow-lg'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="text-2xl font-bold">{lang.nativeName}</div>
                  <div className="text-base text-slate-400">{lang.name}</div>
                </div>
                {isSelected && (
                  <div className="w-10 h-10 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center font-bold">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl rounded-2xl transition"
          >
            {t('languageModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

