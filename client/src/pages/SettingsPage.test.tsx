import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SettingsPage from './SettingsPage';
import { AppContext } from '../AppContext';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

// Mock dependencies
vi.mock('axios');
const mockedAxios = axios as vi.Mocked<typeof axios>;

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

const mockSupermarkets = [
  { id: 1, name: 'Super Store', is_active: 1, last_scrape_time: null, url: 'http://example.com' }
];

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
    mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/api/supermarkets')) return Promise.resolve({ data: mockSupermarkets });
        return Promise.resolve({ data: [] });
    });
  });

  it('uses the CSS class "settings-page-container" for the root element', async () => {
    const { container } = renderWithContext(<SettingsPage />);
    const rootElement = container.querySelector('.settings-page-container');
    expect(rootElement).toBeInTheDocument();
  });

  it('renders General Settings card when Visual tab is selected', async () => {
    const { getByText, findByText } = renderWithContext(<SettingsPage />);
    
    const visualTab = getByText('Visual');
    
    await act(async () => {
      fireEvent.click(visualTab);
    });
    
    const generalSettingsHeader = await findByText('General Settings');
    expect(generalSettingsHeader).toBeInTheDocument();
  });

  it('renders Store Settings card by default', async () => {
    const { getByText } = renderWithContext(<SettingsPage />);
    expect(getByText('Store Settings')).toBeInTheDocument();
  });

  it('verifies touch targets for interactive elements are rendered', async () => {
    const { getByText, findByText } = renderWithContext(<SettingsPage />);
    
    // Check Store Settings tab (default) - find the store name first to ensure data is loaded
    await findByText('Super Store');
    
    // Find switches using role "switch" as seen in debug output
    const storeSwitches = screen.getAllByRole('switch', { hidden: true });
    expect(storeSwitches.length).toBeGreaterThan(0);

    // Switch to Visual tab
    const visualTab = getByText('Visual');
    await act(async () => {
      fireEvent.click(visualTab);
    });

    // Check Visual tab switches
    const visualSwitches = await screen.findAllByRole('switch', { hidden: true });
    expect(visualSwitches.length).toBeGreaterThan(0);
  });
});
