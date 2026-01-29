import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SettingsCard from './SettingsCard';

describe('SettingsCard', () => {
  it('renders title and children', () => {
    render(
      <SettingsCard title="Test Title">
        <div data-testid="child">Test Child</div>
      </SettingsCard>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <SettingsCard title="Title" className="custom-class">
        <div>Content</div>
      </SettingsCard>
    );
    
    // The outermost element should have the class
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
