import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CompetitorStatusBar from '../CompetitorStatusBar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'competitors.statuses.NEW': 'جديد',
        'competitors.statuses.FOLLOWING': 'متابعة',
        'competitors.statuses.COMPLETED': 'منتهي',
      };
      return map[key] || key;
    },
    i18n: { dir: () => 'rtl', language: 'ar' },
  }),
}));

jest.mock('../../../i18n', () => ({
  __esModule: true,
  default: { dir: () => 'rtl', language: 'ar' },
}));

describe('CompetitorStatusBar', () => {
  it('renders all three status options', () => {
    render(<CompetitorStatusBar currentStatus="NEW" />);
    expect(screen.getByText('جديد')).toBeInTheDocument();
    expect(screen.getByText('متابعة')).toBeInTheDocument();
    expect(screen.getByText('منتهي')).toBeInTheDocument();
  });

  it('highlights the active status', () => {
    render(<CompetitorStatusBar currentStatus="NEW" />);
    const newButton = screen.getByText('جديد').closest('button');
    const followingButton = screen.getByText('متابعة').closest('button');
    expect(newButton).toBeDisabled();
    expect(followingButton).not.toBeDisabled();
  });

  it('calls onChange when clicking a non-active status', () => {
    const onChange = jest.fn();
    render(<CompetitorStatusBar currentStatus="NEW" onChange={onChange} />);
    fireEvent.click(screen.getByText('متابعة'));
    expect(onChange).toHaveBeenCalledWith('FOLLOWING');
  });

  it('does not call onChange when clicking the active status', () => {
    const onChange = jest.fn();
    render(<CompetitorStatusBar currentStatus="NEW" onChange={onChange} />);
    fireEvent.click(screen.getByText('جديد'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    render(<CompetitorStatusBar currentStatus="NEW" disabled />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });
});
