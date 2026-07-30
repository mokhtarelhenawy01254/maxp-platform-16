import { useTranslation } from 'react-i18next';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wifi } from 'lucide-react';
import { toast } from 'sonner';
import AutoDiscoverModal from './AutoDiscoverModal';
import i18n from '../../i18n';

const AutoDiscoverPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = React.useState(true);

  const handleAdd = (name: string) => {
    setModalVisible(false);
    toast.success(t('competitors.autoDiscover.addedSuccess'), {
      description: name,
    });
    navigate(`/competitors/add?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="p-6" dir={i18n.dir()}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="text-blue-500 size-5" />
            <span>{t('competitors.autoDiscover.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AutoDiscoverModal
            visible={modalVisible}
            onClose={() => { setModalVisible(false); navigate('/competitors'); }}
            onAddCompetitor={handleAdd}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoDiscoverPage;