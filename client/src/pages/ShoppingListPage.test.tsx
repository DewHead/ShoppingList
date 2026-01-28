import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ShoppingListPage from './ShoppingListPage';
import { AppContext } from '../AppContext';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = axios as vi.Mocked<typeof axios>;

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
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
    <AppContext.Provider value={{ language: 'en', setLanguage: vi.fn(), theme: 'light', setTheme: vi.fn(), backgrounds: [], currentBackground: '', setCurrentBackground: vi.fn() }}>
      {component}
    </AppContext.Provider>
  );
};

describe('ShoppingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/shopping-list')) return Promise.resolve({ data: mockItems });
      if (url.includes('/api/supermarkets')) return Promise.resolve({ data: mockSupermarkets });
      if (url.includes('/api/comparison')) return Promise.resolve({ data: mockComparison });
      return Promise.resolve({ data: [] });
    });
  });

  it('verifies the DOM order: Main List should come before Side Panel (for mobile optimization)', async () => {
    renderWithContext(<ShoppingListPage />);

    // Wait for the content to load
    const myListHeader = await screen.findByText(/My List/i);
    const cheapestStoreHeader = await screen.findByText(/Cheapest Store/i);

    // Get the parent containers that would be reordered
    // The Side Panel container is the first child of the main Box (currently)
    // The Main List container is the second child of the main Box (currently)
    
    // We can check their order by comparing their position in the DOM
    const allText = document.body.innerHTML;
    const myListIndex = allText.indexOf('My List');
    const cheapestStoreIndex = allText.indexOf('Cheapest Store');

    // Currently this will FAIL because Side Panel is above Main List in code
    expect(myListIndex).toBeLessThan(cheapestStoreIndex);
  });
});
