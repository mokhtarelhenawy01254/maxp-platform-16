import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Slider, Button, Spin, Empty, Tag, List, Alert } from 'antd';
import { BulbOutlined, PlusOutlined, ApiOutlined } from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';

interface DiscoveredItem {
  suggestedName: string;
  reason: string;
  matchedProducts: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddCompetitor: (name: string) => void;
}

const AutoDiscoverModal: React.FC<Props> = ({ visible, onClose, onAddCompetitor }) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    discovered: DiscoveredItem[];
    searchedTerms: number;
    yourProductCount: number;
    suggestion: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleDiscover = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const params: Record<string, string | number> = { maxResults };
      if (category.trim()) params.category = category.trim();
      const res = await apiClient.get('/competitors/auto-discover', { params });
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.error || 'Discovery failed');
      }
    } catch {
      setError('Failed to discover competitors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ApiOutlined className="text-blue-500" />
          <span>{t('competitors.autoDiscover.title')}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('competitors.autoDiscover.category')}</label>
          <Input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder={t('competitors.autoDiscover.categoryPlaceholder')}
            allowClear
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {t('competitors.autoDiscover.maxResults')}: {maxResults}
          </label>
          <Slider min={1} max={10} value={maxResults} onChange={setMaxResults} />
        </div>

        <Button
          type="primary"
          icon={<BulbOutlined />}
          onClick={handleDiscover}
          loading={loading}
          size="large"
          block
        >
          {loading ? t('competitors.autoDiscover.discovering') : t('competitors.autoDiscover.discover')}
        </Button>

        {loading && (
          <div className="flex justify-center py-8">
            <Spin tip={t('common.loading')} />
          </div>
        )}

        {error && <Alert message={error} type="error" showIcon />}

        {data && !loading && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap text-sm text-gray-500 dark:text-gray-400">
              <Tag>{t('competitors.autoDiscover.searchingTerms', { count: data.searchedTerms })}</Tag>
              <Tag>{t('competitors.autoDiscover.yourProductsCount', { count: data.yourProductCount })}</Tag>
            </div>

            {data.discovered.length === 0 ? (
              <Empty description={t('competitors.autoDiscover.noResults')} />
            ) : (
              <List
                dataSource={data.discovered}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button
                        key="add"
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={() => onAddCompetitor(item.suggestedName)}
                      >
                        {t('competitors.autoDiscover.add')}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span className="font-semibold dark:text-gray-100">
                          {t('competitors.autoDiscover.suggestedName')}: {item.suggestedName}
                        </span>
                      }
                      description={
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{t('competitors.autoDiscover.reason')}:</span> {item.reason}
                          </div>
                          <Tag color="blue">
                            {t('competitors.autoDiscover.matchedProducts')}: {item.matchedProducts}
                          </Tag>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}

            {data.suggestion && (
              <Alert
                message={
                  <span>
                    <strong>{t('competitors.autoDiscover.suggestion')}:</strong> {data.suggestion}
                  </span>
                }
                type="info"
                showIcon
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AutoDiscoverModal;