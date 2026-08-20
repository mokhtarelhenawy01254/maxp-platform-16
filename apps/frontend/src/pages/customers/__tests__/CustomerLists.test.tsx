import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import CustomerLists from '../CustomerLists';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const listsResponse = {
  success: true,
  data: [
    {
      id: 'all',
      name: '╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í',
      description: '╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å',
      count: 500,
      criteria: { type: 'all' },
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'list_vip',
      name: '╪╣┘à┘ä╪º╪í VIP',
      description: '┘â╪¿╪º╪▒ ╪º┘ä╪╣┘à┘ä╪º╪í',
      count: 42,
      criteria: { type: 'orderStatus', status: 'DELIVERED', days: 30 },
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-05T00:00:00Z',
    },
  ],
};

jest.mock('../../../services/broadcastService', () => ({
  broadcastService: {
    getCustomerLists: jest.fn(),
    getCustomersInListPaginated: jest.fn(),
    createCustomerList: jest.fn(),
    updateCustomerList: jest.fn(),
    deleteCustomerList: jest.fn(),
    refreshCustomerListCount: jest.fn(),
    previewCustomerListCount: jest.fn(),
  },
}));

jest.mock('../../../services/customerService', () => ({
  customerService: {
    getDistinctTags: jest.fn().mockResolvedValue([{ name: 'VIP' }, { name: '╪¼╪»╪»' }]),
  },
}));

const { broadcastService } = require('../../../services/broadcastService') as {
  broadcastService: {
    getCustomerLists: jest.Mock;
    getCustomersInListPaginated: jest.Mock;
    createCustomerList: jest.Mock;
    updateCustomerList: jest.Mock;
    deleteCustomerList: jest.Mock;
    refreshCustomerListCount: jest.Mock;
    previewCustomerListCount: jest.Mock;
  };
};

describe('CustomerLists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    broadcastService.getCustomerLists.mockResolvedValue(listsResponse);
    broadcastService.previewCustomerListCount.mockResolvedValue({ success: true, data: { count: 123 } });
  });

  const renderPage = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CustomerLists />
        <Toaster richColors position="bottom-left" />
      </MemoryRouter>,
    );

  test('┘è╪╣╪▒╪╢ ╪º┘ä╪╣┘å╪º┘ê┘è┘å ┘ê╪º┘ä┘é┘ê╪º╪ª┘à ┘ê╪º┘ä╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬', async () => {
    renderPage();

    expect(await screen.findByText('╪Ñ╪»╪º╪▒╪⌐ ┘é┘ê╪º╪ª┘à ╪º┘ä╪╣┘à┘ä╪º╪í')).toBeInTheDocument();
    expect(screen.getByText('╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í')).toBeInTheDocument();
    expect(screen.getByText('╪╣┘à┘ä╪º╪í VIP')).toBeInTheDocument();
    expect(screen.getByText('┘Ñ┘á┘á')).toBeInTheDocument();
    expect(screen.getByText('┘ñ┘ó')).toBeInTheDocument();
  });

  test('┘è┘é┘ê┘à ╪¿┘ü┘ä╪¬╪▒╪⌐ ╪º┘ä┘é┘ê╪º╪ª┘à ╪¿╪º┘ä╪¿╪¡╪½', async () => {
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    const search = screen.getByPlaceholderText('╪º╪¿╪¡╪½ ┘ü┘è ╪º┘ä┘é┘ê╪º╪ª┘à...');
    await userEvent.type(search, 'VIP');

    expect(screen.queryByText('╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í')).not.toBeInTheDocument();
    expect(screen.getByText('╪╣┘à┘ä╪º╪í VIP')).toBeInTheDocument();
  });

  test('┘è┘ü╪¬╪¡ ┘å╪º┘ü╪░╪⌐ ╪º┘ä╪Ñ┘å╪┤╪º╪í ┘ê┘è╪╣╪▒╪╢ ┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä╪╣╪»╪»', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getByRole('button', { name: /┘é╪º╪ª┘à╪⌐ ╪¼╪»┘è╪»╪⌐/ }));
    expect(await screen.findByText('╪Ñ┘å╪┤╪º╪í ┘é╪º╪ª┘à╪⌐ ╪╣┘à┘ä╪º╪í ╪¼╪»┘è╪»╪⌐')).toBeInTheDocument();

    await waitFor(() => {
      expect(broadcastService.previewCustomerListCount).toHaveBeenCalled();
    });
  });

  test('┘è┘å╪┤╪ª ┘é╪º╪ª┘à╪⌐ ╪¼╪»┘è╪»╪⌐ ╪╣┘å╪» ╪º┘ä╪¡┘ü╪╕', async () => {
    const user = userEvent.setup();
    broadcastService.createCustomerList.mockResolvedValue({ success: true, data: { id: 'new' } });
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getByRole('button', { name: /┘é╪º╪ª┘à╪⌐ ╪¼╪»┘è╪»╪⌐/ }));
    await screen.findByText('╪Ñ┘å╪┤╪º╪í ┘é╪º╪ª┘à╪⌐ ╪╣┘à┘ä╪º╪í ╪¼╪»┘è╪»╪⌐');

    const nameInput = screen.getByLabelText('╪º╪│┘à ╪º┘ä┘é╪º╪ª┘à╪⌐ *');
    await user.type(nameInput, '┘é╪º╪ª┘à╪⌐ ╪¬╪¼╪▒┘è╪¿┘è╪⌐');

    await user.click(screen.getByRole('button', { name: '╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º╪ª┘à╪⌐' }));

    await waitFor(() => {
      expect(broadcastService.createCustomerList).toHaveBeenCalledWith(
        expect.objectContaining({ name: '┘é╪º╪ª┘à╪⌐ ╪¬╪¼╪▒┘è╪¿┘è╪⌐' }),
      );
    });
  });

  test('┘è┘ü╪¬╪¡ ╪º┘ä╪¬╪╣╪»┘è┘ä ┘ä┘é╪º╪ª┘à╪⌐ ┘à╪«╪╡╪╡╪⌐ ┘à╪╣ ╪¿┘è╪º┘å╪º╪¬┘ç╪º', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getAllByRole('button', { name: /╪¬╪╣╪»┘è┘ä/ })[0]);

    expect(await screen.findByText('╪¬╪╣╪»┘è┘ä ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í')).toBeInTheDocument();
    expect(screen.getByLabelText('╪º╪│┘à ╪º┘ä┘é╪º╪ª┘à╪⌐ *')).toHaveValue('╪╣┘à┘ä╪º╪í VIP');
  });

  test('┘è╪¡╪░┘ü ┘é╪º╪ª┘à╪⌐ ┘à╪«╪╡╪╡╪⌐ ╪¿╪╣╪» ╪º┘ä╪¬╪ú┘â┘è╪»', async () => {
    const user = userEvent.setup();
    broadcastService.deleteCustomerList.mockResolvedValue({ success: true });
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getAllByRole('button', { name: '╪¡╪░┘ü' })[0]);

    expect(await screen.findByText('╪¡╪░┘ü ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '╪¡╪░┘ü' }));

    await waitFor(() => {
      expect(broadcastService.deleteCustomerList).toHaveBeenCalledWith('list_vip');
    });
  });

  test('╪▓╪▒ ┘ê╪º╪¬╪│╪º╪¿ ┘è┘å┘é┘ä ╪Ñ┘ä┘ë template-broadcast ┘à╪╣ listId', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getAllByRole('button', { name: /┘ê╪º╪¬╪│╪º╪¿/ })[1]);

    expect(mockNavigate).toHaveBeenCalledWith('/whatsapp/template-broadcast?listId=list_vip');
  });

  test('┘è╪╣╪▒╪╢ ╪ú╪╣╪╢╪º╪í ╪º┘ä┘é╪º╪ª┘à╪⌐ ┘ü┘è ╪º┘ä┘Ç Sheet ┘à╪╣ ╪º┘ä╪¬╪▒┘é┘è┘à', async () => {
    const user = userEvent.setup();
    broadcastService.getCustomersInListPaginated.mockResolvedValue({
      success: true,
      data: [
        { id: 'c1', name: '┘à╪¡┘à╪» ╪ú╪¡┘à╪»', phone: '201000', email: '', lastActivity: '2026-01-01', status: 'active', rating: 'EXCELLENT', tags: '', totalSpent: 5000, ordersCount: 5, rfmScore: 76, rfmTier: 'gold' },
        { id: 'c2', name: '╪│╪º╪▒╪⌐ ╪╣┘ä┘è', phone: '201001', email: '', lastActivity: '2026-01-02', status: 'inactive', rating: 'GOOD', tags: '', totalSpent: 100, ordersCount: 1, rfmScore: 10, rfmTier: 'lead' },
      ],
      total: 2,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getAllByRole('button', { name: /╪º┘ä╪ú╪╣╪╢╪º╪í/ })[1]);

    expect(await screen.findByText('┘à╪¡┘à╪» ╪ú╪¡┘à╪»')).toBeInTheDocument();
    expect(screen.getByText('╪│╪º╪▒╪⌐ ╪╣┘ä┘è')).toBeInTheDocument();
    expect(screen.getByText(/╪░┘ç╪¿┘è/)).toBeInTheDocument();
    expect(broadcastService.getCustomersInListPaginated).toHaveBeenCalledWith('list_vip', 1, 20, '');
  });

  test('┘è┘å╪│╪« ┘é╪º╪ª┘à╪⌐ ┘à╪«╪╡╪╡╪⌐ (Duplicate)', async () => {
    const user = userEvent.setup();
    broadcastService.createCustomerList.mockResolvedValue({ success: true, data: { id: 'copy' } });
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getAllByRole('button', { name: /┘å╪│╪«/ })[0]);

    await waitFor(() => {
      expect(broadcastService.createCustomerList).toHaveBeenCalledWith(
        expect.objectContaining({ name: '╪╣┘à┘ä╪º╪í VIP (┘å╪│╪«╪⌐)' }),
      );
    });
  });

  test('┘è╪╣╪▒╪╢ ┘é┘ê╪º┘ä╪¿ RFM ┘ü┘è ┘å╪º┘ü╪░╪⌐ ╪º┘ä╪Ñ┘å╪┤╪º╪í', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getByRole('button', { name: /┘é╪º╪ª┘à╪⌐ ╪¼╪»┘è╪»╪⌐/ }));
    await screen.findByText('╪Ñ┘å╪┤╪º╪í ┘é╪º╪ª┘à╪⌐ ╪╣┘à┘ä╪º╪í ╪¼╪»┘è╪»╪⌐');

    expect(screen.getByText('╪ú┘ü╪╢┘ä ╪º┘ä╪╣┘à┘ä╪º╪í')).toBeInTheDocument();
    expect(screen.getByText('╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪ú┘ê┘ü┘è╪º╪í')).toBeInTheDocument();
    expect(screen.getByText('┘à╪╣╪▒╪╢┘ê┘å ┘ä┘ä┘ü┘é╪»╪º┘å')).toBeInTheDocument();
    expect(screen.getByText('╪╣┘à┘ä╪º╪í ╪¼╪»╪»')).toBeInTheDocument();
  });

  test('╪º╪«╪¬┘è╪º╪▒ ┘é╪º┘ä╪¿ RFM ┘è╪╢╪¿╪╖ ╪º┘ä┘à╪╣╪º┘è┘è╪▒ ┘ê┘è╪╣╪º┘è┘å ╪º┘ä╪╣╪»╪»', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('╪╣┘à┘ä╪º╪í VIP');

    await user.click(screen.getByRole('button', { name: /┘é╪º╪ª┘à╪⌐ ╪¼╪»┘è╪»╪⌐/ }));
    await screen.findByText('╪Ñ┘å╪┤╪º╪í ┘é╪º╪ª┘à╪⌐ ╪╣┘à┘ä╪º╪í ╪¼╪»┘è╪»╪⌐');

    await user.click(screen.getByText('╪ú┘ü╪╢┘ä ╪º┘ä╪╣┘à┘ä╪º╪í'));

    await waitFor(() => {
      expect(broadcastService.previewCustomerListCount).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preset', preset: 'champions' }),
      );
    });
  });
});
