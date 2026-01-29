import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SettingsPage from './SettingsPage';
import { AppContext } from '../AppContext';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  }
}));

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock('../useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

const renderWithContext = (component: React.ReactNode) => {
  return render(
    <AppContext.Provider value={{ 
      language: 'en', 
      toggleLanguage: vi.fn(), 
      theme: 'light', 
      toggleColorMode: vi.fn(), 
      background: 'default', 
      setBackground: vi.fn() 
    } as any}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </AppContext.Provider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the CSS class "settings-page-container" for the root element', async () => {
    const { container } = renderWithContext(<SettingsPage />);
    // This is the specific class we plan to add in the CSS file
    const rootElement = container.querySelector('.settings-page-container');
    expect(rootElement).toBeInTheDocument();
  });
});
