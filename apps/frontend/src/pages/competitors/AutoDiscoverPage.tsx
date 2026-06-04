import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, notification } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import AutoDiscoverModal from './AutoDiscoverModal';

const AutoDiscoverPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = React.useState(true);

  const handleAdd = (name: string) => {
    setModalVisible(false);
    notification.success({
      message: t('competitors.autoDiscover.addedSuccess'),
      description: name,
    });
    navigate(`/competitors/add?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="p-6" dir="auto">
      <Card
        title={
          <div className="flex items-center gap-2">
            <ApiOutlined className="text-blue-500" />
            <span>{t('competitors.autoDiscover.title')}</span>
          </div>
        }
      >
        <AutoDiscoverModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); navigate('/competitors'); }}
          onAddCompetitor={handleAdd}
        />
      </Card>
    </div>
  );
};

export default AutoDiscoverPage;