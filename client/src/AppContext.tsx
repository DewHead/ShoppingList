import { createContext } from 'react';

export const AppContext = createContext({ 
  toggleColorMode: () => {},
  language: 'en',
  toggleLanguage: () => {},
  background: 'black & white',
  setBackground: (_background: string) => {},
  showCreditCardPromos: false,
  toggleCreditCardPromos: (_value: boolean) => {},
});
