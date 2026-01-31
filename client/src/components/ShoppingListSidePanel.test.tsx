// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ShoppingListSidePanel from './ShoppingListSidePanel';
import { AppContext } from '../AppContext';
import React from 'react';

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

const mockProps = {
  selectedItemIds: [1],
  selectedItems: [{ id: 1, itemName: 'Milk', quantity: 1, itemId: 101, is_done: 0 }],
  cheapestStore: null,
  groupedMatchesByStore: {
    'Supermarket A': [
      {
        item: { id: 1, itemName: 'Milk', quantity: 1, itemId: 101, is_done: 0 },
        matches: [
          { supermarket_id: 1, supermarket_name: 'Supermarket A', remote_name: 'Milk', price: 10, remote_id: '123' }
        ]
      }
    ]
  },
  loadingMatches: false,
  expandedStores: ['Supermarket A'],
  toggleStore: vi.fn(),
  toggleAllStores: vi.fn(),
  clearSelection: vi.fn(),
  handlePinItem: vi.fn(),
  minTotalsPerItem: { 1: 10 },
  storeResults: {},
  activeSale: null,
  setActiveSale: vi.fn()
};

describe('ShoppingListSidePanel', () => {
  it('renders "Matches for" card with sticky header and scrollable content', () => {
    renderWithContext(<ShoppingListSidePanel {...mockProps} />);

    // Check for Sticky Header
    // The header contains the text "Matches for"
    // We navigate to the specific container box
    const headerTitle = screen.getByText(/Matches for/i);
    const headerContainer = headerTitle.closest('div');
    // The immediate parent of Typography is the Box with the borderBottom
    // <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
    
    // We expect this to have sticky positioning in the new implementation
    expect(headerContainer).toHaveStyle({
      position: 'sticky',
      top: '0px',
      zIndex: '1',
      backgroundColor: 'rgb(255, 255, 255)' // or equivalent theme color, strict equality might fail if theme var is used but we can check property existence
    });

    // Check for Scrollable Content
    // The content contains the store name
    const storeName = screen.getByText('Supermarket A');
    // storeName -> Typography -> Box (row) -> Box (store container) -> Box (list container)
    // The list container is what we want to be scrollable.
    
    // <Box sx={{ display: 'flex', flexDirection: 'column' }}> which wraps the store map.
    // This is the sibling of the header.
    
    // Let's traverse up from storeName to find the container.
    // storeName is in a Typography or direct text.
    // Parent 1: Box (flex row)
    // Parent 2: Box (outer store container with borderBottom)
    // Parent 3: The container we want.
    
    // We can assume the container is the parent of the store row.
    const storeRow = storeName.closest('.MuiBox-root')?.parentElement; // Box (outer store container)
    const contentContainer = storeRow?.parentElement;

    expect(contentContainer).toHaveStyle({
      overflowY: 'auto'
      // maxHeight check might be tricky with responsive values, but we can check if property is set
    });
  });

  it('verifies "Cheapest Store" card maintains its existing breakdown scrollable behavior', () => {
    const cheapestStoreProps = {
      ...mockProps,
      selectedItemIds: [],
      cheapestStore: {
        name: 'Supermarket A',
        total: '10.00',
        results: [
          { item: { itemName: 'Milk' }, name: 'Milk', price: '10.00' }
        ],
        missing: 0
      }
    };

    renderWithContext(<ShoppingListSidePanel {...cheapestStoreProps} />);

    // Check for Cheapest Store text to confirm it renders
    expect(screen.getByText(/cheapest store/i)).toBeInTheDocument();

    // The breakdown list is inside a Collapse, but in JSDOM we can find it.
    // <List sx={{ p: 0, mt: 1, maxHeight: '50vh', overflowY: 'auto' }}>
    const breakdownList = screen.getByRole('list', { hidden: true });
    expect(breakdownList).toHaveStyle({
      maxHeight: '50vh',
      overflowY: 'auto'
    });
  });
});
