import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ShoppingListPage from './ShoppingListPage';
import { AppContext } from '../AppContext';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = axios as any;

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: vi.fn(({ data, itemContent }) => (
    <div data-testid="mock-virtuoso">
      {data.map((item: any, index: number) => (
        <div key={item.id} data-testid="virtuoso-item">
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  )),
}));

const mockItems = [
  { id: 1, itemName: 'Milk', quantity: 2, itemId: 101, is_done: 0 }
];

const mockSupermarkets = [
  { id: 1, name: 'Super Store' }
];

const mockComparison = {
  "1": {
    results: [
      { item: { id: 1, itemName: 'Milk' }, price: '₪10.00', name: 'Milk 1L', quantity: 2, rawPrice: 10 }
    ]
  }
};

const renderWithContext = (component: React.ReactNode) => {
  return render(
    <AppContext.Provider value={{ 
        language: 'en', 
        toggleLanguage: vi.fn(), 
        toggleColorMode: vi.fn(),
        background: 'monochrome', 
        setBackground: vi.fn(),
        showCreditCardPromos: false,
        toggleCreditCardPromos: vi.fn()
    }}>
      {component}
    </AppContext.Provider>
  );
};

describe('ShoppingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/shopping-list')) return Promise.resolve({ data: mockItems });
      if (url.includes('/api/supermarkets')) return Promise.resolve({ data: mockSupermarkets });
      if (url.includes('/api/comparison')) return Promise.resolve({ data: mockComparison });
      return Promise.resolve({ data: [] });
    });
  });

  it('verifies the DOM order: Main List should come before Side Panel (for mobile optimization)', async () => {
    renderWithContext(<ShoppingListPage />);

    // Wait for the content to load
    await screen.findByText(/My List/i);
    await screen.findByText(/Cheapest Store/i);

    const allText = document.body.innerHTML;
    const myListIndex = allText.indexOf('My List');
    const cheapestStoreIndex = allText.indexOf('Cheapest Store');

    expect(myListIndex).toBeLessThan(cheapestStoreIndex);
  });

  it('verifies the asymmetrical grid layout for desktop', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithContext(<ShoppingListPage />);

    const mainContainer = await screen.findByTestId('shopping-list-container');
    expect(mainContainer).toHaveStyle({
        maxWidth: '1400px'
    });
  });

  it('verifies side panel cohesion: Side panel cards should be outlined to distinguish from main list', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: false, 
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
  
      renderWithContext(<ShoppingListPage />);
  
      const cheapestStoreHeader = await screen.findByText(/Cheapest Store/i);
      const sidePanelCard = cheapestStoreHeader.closest('.MuiPaper-root');
      
      expect(sidePanelCard).toHaveClass('MuiPaper-outlined');
  });

  it('virtualizes the list when many items are present', async () => {
    const hundredItems = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      itemName: `Item ${i}`,
      quantity: 1,
      itemId: 1000 + i,
      is_done: 0
    }));

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/api/shopping-list')) return Promise.resolve({ data: hundredItems });
      if (url.includes('/api/supermarkets')) return Promise.resolve({ data: mockSupermarkets });
      if (url.includes('/api/comparison')) return Promise.resolve({ data: {} });
      return Promise.resolve({ data: [] });
    });

    renderWithContext(<ShoppingListPage />);

    const virtuoso = await screen.findByTestId('mock-virtuoso');
    expect(virtuoso).toBeInTheDocument();

    const items = screen.getAllByTestId('virtuoso-item');
    expect(items.length).toBe(100);
  });
});