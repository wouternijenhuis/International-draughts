import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvatarSelector } from '../AvatarSelector';

describe('AvatarSelector', () => {
  it('renders all avatar options', () => {
    render(<AvatarSelector currentAvatarId="default" onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Crown')).toBeInTheDocument();
    expect(screen.getByLabelText('Star')).toBeInTheDocument();
    expect(screen.getByLabelText('Robot')).toBeInTheDocument();
  });

  it('highlights current avatar', () => {
    render(<AvatarSelector currentAvatarId="crown" onSelect={vi.fn()} onClose={vi.fn()} />);
    const crownBtn = screen.getByLabelText('Crown');
    expect(crownBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onSelect when avatar clicked', () => {
    const onSelect = vi.fn();
    render(<AvatarSelector currentAvatarId="default" onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Fire'));
    expect(onSelect).toHaveBeenCalledWith('fire');
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<AvatarSelector currentAvatarId="default" onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
