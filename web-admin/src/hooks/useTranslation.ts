import { useEffect, useState } from 'react';
import translations from '../i18n/translations.json';

export const useTranslation = () => {
  const [language, setLanguage] = useState<'vi' | 'en' | 'ko' | 'ja'>('vi');

  useEffect(() => {
    const savedLanguage = (localStorage.getItem('language') || 'vi') as 'vi' | 'en' | 'ko' | 'ja';
    setLanguage(savedLanguage);
  }, []);

  const t = (key: string, defaultValue?: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    return typeof value === 'string' ? value : defaultValue || key;
  };

  return { t, language };
};
