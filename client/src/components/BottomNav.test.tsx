import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

// Mock translation hook
vi.mock('../useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing on desktop', () => {
    // Default mock is matches: false
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    
    expect(screen.queryByText('list')).toBeNull();
  });

  it('renders navigation actions on mobile', () => {
    // Mock mobile view
    (window.matchMedia as any).mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    
    expect(screen.getByText('list')).toBeDefined();
    expect(screen.getByText('compare')).toBeDefined();
    expect(screen.getByText('settings')).toBeDefined();
  });
});
