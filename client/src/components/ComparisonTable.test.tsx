import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ComparisonTable from './ComparisonTable';
import type { ComparisonMatrixRow } from '../utils/comparisonUtils';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock translation
vi.mock('../useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const theme = createTheme();

describe('ComparisonTable', () => {
  const mockData: ComparisonMatrixRow[] = [
    {
      productName: 'Milk',
      prices: {
        1: { price: 5, displayPrice: '₪5.00', isCheapest: true, status: 'available' },
        2: { price: 6, displayPrice: '₪6.00', isCheapest: false, status: 'available' }
      }
    }
  ];

  const activeStores = [
    { id: 1, name: 'Store A' },
    { id: 2, name: 'Store B' }
  ];

  const mockOnSort = vi.fn();
  const sortConfig = { key: 'product', direction: 'asc' as const };

  const renderTable = (props: any = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <ComparisonTable 
          data={mockData}
          activeStores={activeStores}
          onSort={mockOnSort}
          sortConfig={sortConfig}
          {...props}
        />
      </ThemeProvider>
    );
  };

  it('renders table headers', () => {
    renderTable();
    expect(screen.getByText('product')).toBeDefined();
    expect(screen.getByText('Store A')).toBeDefined();
    expect(screen.getByText('Store B')).toBeDefined();
  });

  it('renders data rows', () => {
    renderTable();
    expect(screen.getByText('Milk')).toBeDefined();
    expect(screen.getByText('₪5.00')).toBeDefined();
    expect(screen.getByText('₪6.00')).toBeDefined();
  });

  it('calls onSort when header clicked', () => {
    renderTable();
    fireEvent.click(screen.getByText('product'));
    expect(mockOnSort).toHaveBeenCalledWith('product', 'desc'); // Already asc, toggle to desc

    fireEvent.click(screen.getByText('Store A'));
    expect(mockOnSort).toHaveBeenCalledWith(1, 'asc'); // New sort
  });

  it('renders no data message', () => {
    renderTable({ data: [] });
    expect(screen.getByText('noData')).toBeDefined();
  });
});
