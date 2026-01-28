import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AddItemFAB from './AddItemFAB';

// Mock translation hook
vi.mock('../useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AddItemFAB', () => {
  it('renders the FAB', () => {
    render(<AddItemFAB onAdd={vi.fn()} autocompleteOptions={[]} />);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('opens dialog when clicked', () => {
    render(<AddItemFAB onAdd={vi.fn()} autocompleteOptions={[]} />);
    const fab = screen.getByRole('button');
    fireEvent.click(fab);
    
    expect(screen.getByPlaceholderText('addItemPlaceholder')).toBeDefined();
  });
});
