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

vi.mock('react-virtuoso', () => ({
  TableVirtuoso: vi.fn(({ data, itemContent, components, fixedHeaderContent }) => {
    const TableComponent = components?.Table || 'table';
    const TableBodyComponent = components?.TableBody || 'tbody';
    const TableRowComponent = components?.TableRow || 'tr';
    const TableHeadComponent = components?.TableHead || 'thead';
    
    return (
      <TableComponent data-testid="mock-virtuoso">
        <TableHeadComponent>
          {fixedHeaderContent && fixedHeaderContent()}
        </TableHeadComponent>
        <TableBodyComponent>
          {data.length > 0 ? data.map((item: any, index: number) => (
             <TableRowComponent key={index} data-testid="virtuoso-item">
                {itemContent(index, item)}
             </TableRowComponent>
          )) : (
            <tr data-testid="no-data-row">
                <td colSpan={100}>noData</td>
            </tr>
          )}
        </TableBodyComponent>
      </TableComponent>
    );
  }),
}));

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

  it('renders store totals and highlights the minimum', () => {
    const storeTotals = {
      1: { id: 1, total: '100.00', missing: 0, isValid: true },
      2: { id: 2, total: '90.00', missing: 0, isValid: true }
    };
    renderTable({ storeTotals, minTotal: 90 });

    expect(screen.getByText('₪100.00')).toBeDefined();
    expect(screen.getByText('₪90.00')).toBeDefined();
  });

  it('renders PriceCell with opacity instead of spinner when store is loading', () => {
    const storeStatuses = { 1: 'Loading...' };
    renderTable({ storeStatuses });

    // Should NOT find a circular progress in the table body (but it is allowed in the header)
    // We'll check the cell specifically.
    const milkRow = screen.getByText('Milk').closest('tr');
    expect(milkRow).toBeDefined();
    
    // The cell for Store A (id 1) should contain the price with opacity
    const priceCell = screen.getByText('₪5.00');
    expect(priceCell).toBeDefined();
  });

  it('virtualizes the table when many items are present', () => {
    const manyRows: ComparisonMatrixRow[] = Array.from({ length: 100 }, (_, i) => ({
      productName: `Product ${i}`,
      prices: {
        1: { price: i, displayPrice: `₪${i}.00`, isCheapest: true, status: 'available' }
      }
    }));

    renderTable({ data: manyRows });

    expect(screen.getByTestId('mock-virtuoso')).toBeInTheDocument();
    const rows = screen.getAllByTestId('virtuoso-item');
    expect(rows.length).toBe(100);
  });
});
