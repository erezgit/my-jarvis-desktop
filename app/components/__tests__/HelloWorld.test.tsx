import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelloWorld } from '../HelloWorld';

describe('HelloWorld Component', () => {
  it('should render the Hello World heading', () => {
    render(<HelloWorld />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Hello World');
  });

  it('should render the welcome message', () => {
    render(<HelloWorld />);
    const message = screen.getByText('Welcome to the Hello World React Component');
    expect(message).toBeInTheDocument();
  });

  it('should render with proper styling classes', () => {
    render(<HelloWorld />);
    const container = screen.getByRole('heading', { level: 1 }).closest('div').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
