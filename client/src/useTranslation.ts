import { useContext } from 'react';
import { AppContext } from './AppContext'; 
import { translations } from './translations';

type TranslationKey = keyof typeof translations;

export const useTranslation = () => {
  const { language } = useContext(AppContext);

  const t = (key: TranslationKey | string, replacements?: { [key: string]: string }) => {
    const translation = (translations as any)[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    let text = translation[language] || key;
    if (replacements) {
      for (const placeholder in replacements) {
        text = text.replace(`%${placeholder}%`, replacements[placeholder]);
      }
    }
    return text;
  };

  return { t, language };
};
