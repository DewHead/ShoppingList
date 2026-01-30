import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import App from './App';
import { AppContext } from './AppContext';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  }
}));

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

const mockContextValue = {
  language: 'en',
  toggleLanguage: vi.fn(),
  background: 'monochrome',
  setBackground: vi.fn(),
  toggleColorMode: vi.fn(),
  items: [],
  refreshItems: vi.fn(),
};

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <App />
      </AppContext.Provider>
    );
    expect(screen.getByText(/Smart Cart/i)).toBeInTheDocument();
  });

  it('shows loading fallback initially', () => {
    render(
      <AppContext.Provider value={mockContextValue}>
        <App />
      </AppContext.Provider>
    );
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });
});
