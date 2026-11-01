import { SampleOrder, SampleOrderStage, PartnerFactory } from '../../manufacturingApi';

export type DrawerTab = 'info' | 'stages' | 'attachments' | 'finance' | 'components';

export interface SampleDetailDrawerProps {
  sample: SampleOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEdit?: (sample: SampleOrder) => void;
  onDelete?: (sample: SampleOrder) => void;
}
