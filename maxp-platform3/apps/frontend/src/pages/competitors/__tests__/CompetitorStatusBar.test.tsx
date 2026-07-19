import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  it('shows only the current status badge', () => {
    render(<CompetitorStatusBar currentStatus="NEW" />);
    expect(screen.getByText('جديد')).toBeInTheDocument();
    expect(screen.queryByText('متابعة')).not.toBeInTheDocument();
    expect(screen.queryByText('منتهي')).not.toBeInTheDocument();
  });

  it('opens dropdown with all three options when clicked', async () => {
    render(<CompetitorStatusBar currentStatus="NEW" />);
    fireEvent.click(screen.getByText('جديد'));
    await waitFor(() => {
      expect(screen.getByText('متابعة')).toBeInTheDocument();
      expect(screen.getByText('منتهي')).toBeInTheDocument();
    });
  });

  it('calls onChange when selecting a different status', async () => {
    const onChange = jest.fn();
    render(<CompetitorStatusBar currentStatus="NEW" onChange={onChange} />);
    fireEvent.click(screen.getByText('جديد'));
    await waitFor(() => {
      expect(screen.getByText('متابعة')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('متابعة'));
    expect(onChange).toHaveBeenCalledWith('FOLLOWING');
  });

  it('does not call onChange when clicking the active status in dropdown', async () => {
    const onChange = jest.fn();
    render(<CompetitorStatusBar currentStatus="NEW" onChange={onChange} />);
    fireEvent.click(screen.getByText('جديد'));
    await waitFor(() => {
      const items = screen.getAllByText('جديد');
      const dropdownItem = items[1];
      expect(dropdownItem).toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    render(<CompetitorStatusBar currentStatus="NEW" disabled />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });
});
