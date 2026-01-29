import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceCell from './PriceCell';
import type { PriceInfo } from '../utils/comparisonUtils';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock translation
vi.mock('../useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const theme = createTheme();

describe('PriceCell', () => {
  const renderCell = (priceInfo: PriceInfo) => {
    return render(
      <ThemeProvider theme={theme}>
        <PriceCell priceInfo={priceInfo} />
      </ThemeProvider>
    );
  };

  it('renders standard price', () => {
    const info: PriceInfo = {
      price: 10,
      displayPrice: '₪10.00',
      isCheapest: false,
      status: 'available'
    };
    renderCell(info);
    expect(screen.getByText('₪10.00')).toBeDefined();
    expect(screen.queryByText('bestPrice')).toBeNull();
  });

  it('renders cheapest price with badge', () => {
    const info: PriceInfo = {
      price: 10,
      displayPrice: '₪10.00',
      isCheapest: true,
      status: 'available'
    };
    renderCell(info);
    expect(screen.getByText('₪10.00')).toBeDefined();
    expect(screen.getByText('bestPrice')).toBeDefined();
  });

  it('renders missing price', () => {
    const info: PriceInfo = {
      price: 0,
      displayPrice: '-',
      isCheapest: false,
      status: 'missing'
    };
    renderCell(info);
    expect(screen.getByText('-')).toBeDefined();
  });

  it('renders promo indicator', () => {
    const info: PriceInfo = {
        price: 10,
        displayPrice: '₪10.00',
        isCheapest: false,
        status: 'available',
        promo: 'Discount'
      };
      renderCell(info);
      expect(screen.getByText('promo')).toBeDefined();
  });
});
