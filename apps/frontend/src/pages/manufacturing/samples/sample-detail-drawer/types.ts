import { SampleOrder, SampleOrderStage, PartnerFactory } from '../../manufacturingApi';

export type DrawerTab = 'info' | 'stages' | 'attachments' | 'finance' | 'components';

export interface SampleDetailDrawerProps {
  sample: SampleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}
