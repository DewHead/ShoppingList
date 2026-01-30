import { StrictMode, useState, useMemo, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from '@mui/material/styles'
import type { PaletteMode } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from './theme'
import { AppContext } from './AppContext'
import './index.css'

function Main() {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as PaletteMode) || 'dark';
  });

  const [language, setLanguage] = useState<'en' | 'he'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as 'en' | 'he') || 'en';
  });

  const [background, setBackground] = useState<string>(() => {
    const saved = localStorage.getItem('background');
    return saved || 'monochrome';
  });

  const [showCreditCardPromos, setShowCreditCardPromos] = useState<boolean>(() => {
    const saved = localStorage.getItem('showCreditCardPromos');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleCreditCardPromos = (value: boolean) => {
    setShowCreditCardPromos(value);
    localStorage.setItem('showCreditCardPromos', JSON.stringify(value));
  };

  const direction = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (background) {
      document.body.style.backgroundImage = `url(/${background}.webp)`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
  }, [background]);

  const appContext = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      language,
      toggleLanguage: () => {
        setLanguage((prevLang) => {
          const newLang = prevLang === 'en' ? 'he' : 'en';
          localStorage.setItem('language', newLang);
          return newLang;
        });
      },
      background,
      setBackground: (newBackground: string) => {
        setBackground(newBackground);
        localStorage.setItem('background', newBackground);
      },
      showCreditCardPromos,
      toggleCreditCardPromos,
    }),
    [language, background, showCreditCardPromos],
  );

  const theme = useMemo(() => getTheme(mode, direction), [mode, direction]);

  return (
    <AppContext.Provider value={appContext}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </AppContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>,
)