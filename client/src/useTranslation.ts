import { useContext } from 'react';
import { AppContext } from './AppContext'; 
import { translations } from './translations';

type TranslationKey = keyof typeof translations;

export const useTranslation = () => {
  const { language } = useContext(AppContext);

  const t = (key: TranslationKey, replacements?: { [key: string]: string }) => {
    let text = translations[key][language];
    if (replacements) {
      for (const placeholder in replacements) {
        text = text.replace(`%${placeholder}%`, replacements[placeholder]);
      }
    }
    return text;
  };

  return { t, language };
};
