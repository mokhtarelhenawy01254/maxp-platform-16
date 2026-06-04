import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Badge,
  Spin,
  Empty,
  List,
  Avatar,
  Rate,
  Tabs,
  Progress,
} from 'antd';
import {
  AmazonOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  ShopOutlined,
  StarOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const platformIcons = {
  amazon: <AmazonOutlined style={{ fontSize: 20, color: '#FF9900' }} />,
  google: <EnvironmentOutlined style={{ fontSize: 20, color: '#4285F4' }} />,
  shopify: <ShopOutlined style={{ fontSize: 20, color: '#96BF48' }} />,
  tech: <GlobalOutlined style={{ fontSize: 20, color: '#666' }} />,
};

export default function PlatformOverview() {
  const { t } = useTranslation();
  const { competitorId } = useParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [amazonProducts, setAmazonProducts] = useState([]);
  const [googleBusiness, setGoogleBusiness] = useState(null);
  const [techStack, setTechStack] = useState([]);
  const [activeTab, setActiveTab] = useState('amazon');

  useEffect(() => {
    if (competitorId) {
      fetchData();
    }
  }, [competitorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, amazonRes, googleRes, techRes] = await Promise.all([
        axios.get(`/api/v1/competitors/platform/summary/${competitorId}`),
        axios.get(`/api/v1/competitors/platform/amazon/${competitorId}`).catch(() => []),
        axios.get(`/api/v1/competitors/platform/google/${competitorId}`).catch(() => null),
        axios.get(`/api/v1/competitors/platform/techstack/${competitorId}`).catch(() => []),
      ]);

      setSummary(summaryRes.data);
      setAmazonProducts(amazonRes.data?.slice(0, 20) || []);
      setGoogleBusiness(googleRes.data);
      setTechStack(techRes.data);
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const amazonColumns = [
    {
      title: t('competitors.product'),
      dataIndex: 'productTitle',
      key: 'productTitle',
      render: (text, record) => (
        <div className="flex items-center gap-2">
          {record.imageUrl && (
            <img src={record.imageUrl} alt="" className="w-10 h-10 object-contain" />
          )}
          <span className="line-clamp-2">{text}</span>
        </div>
      ),
    },
    {
      title: t('competitors.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <span className="font-medium">
          {record.currency} {price ? Number(price).toFixed(2) : 'N/A'}
        </span>
      ),
    },
    {
      title: 'BSR',
      dataIndex: 'bsrRank',
      key: 'bsrRank',
      render: (rank) => (rank ? `#${rank.toLocaleString()}` : 'N/A'),
    },
    {
      title: t('competitors.reviews'),
      dataIndex: 'reviewCount',
      key: 'reviewCount',
      render: (count) => count?.toLocaleString() || '0',
    },
    {
      title: t('competitors.rating'),
      dataIndex: 'reviewRating',
      key: 'reviewRating',
      render: (rating) => (
        <span className="flex items-center gap-1">
          <StarOutlined style={{ color: '#fadb14' }} />
          {rating ? Number(rating).toFixed(1) : 'N/A'}
        </span>
      ),
    },
    {
      title: 'Prime',
      dataIndex: 'isPrime',
      key: 'isPrime',
      render: (isPrime) =>
        isPrime ? (
          <Tag color="gold">Prime</Tag>
        ) : (
          <Tag>Standard</Tag>
        ),
    },
    {
      title: t('competitors.status'),
      dataIndex: 'isAvailable',
      key: 'isAvailable',
      render: (isAvailable) => (
        <Badge status={isAvailable ? 'success' : 'error'} text={isAvailable ? 'In Stock' : 'Out of Stock'} />
      ),
    },
  ];

  const techColumns = [
    {
      title: t('competitors.category'),
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: t('competitors.technology'),
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-medium">{name}</span>,
    },
    {
      title: t('competitors.version'),
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: t('competitors.confidence'),
      dataIndex: 'confidence',
      key: 'confidence',
      render: (conf) => (
        <Tag color={conf === 'high' ? 'green' : conf === 'medium' ? 'orange' : 'red'}>
          {conf}
        </Tag>
      ),
    },
  ];

  if (loading) return <Spin size="large" className="flex justify-center mt-10" />;

  if (!summary) {
    return (
      <Empty description={t('competitors.noPlatformData')} className="mt-10">
        <Tag color="blue">{t('competitors.addPlatformData')}</Tag>
      </Empty>
    );
  }

  const tabItems = [
    {
      key: 'amazon',
      label: (
        <span className="flex items-center gap-1">
          {platformIcons.amazon} Amazon
        </span>
      ),
      children: (
        <div className="space-y-4">
          {summary.amazon && (
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('competitors.totalProducts')}
                    value={summary.amazon.totalProducts}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('competitors.avgPrice')}
                    value={summary.amazon.avgPrice}
                    prefix="$"
                    precision={2}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title={t('competitors.avgRating')}
                    value={summary.amazon.avgRating}
                    precision={1}
                    suffix="/ 5"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Prime %"
                    value={summary.amazon.primePercentage}
                    suffix="%"
                    precision={1}
                  />
                </Card>
              </Col>
            </Row>
          )}
          <Card title={t('competitors.amazonProducts')}>
            <Table
              dataSource={amazonProducts}
              columns={amazonColumns}
              rowKey="asin"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'google',
      label: (
        <span className="flex items-center gap-1">
          {platformIcons.google} Google Business
        </span>
      ),
      children: summary.googleBusiness ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title={t('competitors.businessInfo')}>
              <List>
                <List.Item>
                  <span className="text-gray-500 w-24">{t('competitors.address')}:</span>
                  <span>{summary.googleBusiness.address || 'N/A'}</span>
                </List.Item>
                <List.Item>
                  <span className="text-gray-500 w-24">{t('competitors.phone')}:</span>
                  <span>{summary.googleBusiness.phone || 'N/A'}</span>
                </List.Item>
                <List.Item>
                  <span className="text-gray-500 w-24">{t('competitors.website')}:</span>
                  <a href={summary.googleBusiness.website} target="_blank" rel="noopener">
                    {summary.googleBusiness.website || 'N/A'}
                  </a>
                </List.Item>
              </List>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={t('competitors.ratings')}>
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-center">
                    <Rate disabled allowHalf value={Number(summary.googleBusiness.rating) || 0} />
                    <div className="text-2xl font-bold mt-2">
                      {summary.googleBusiness.rating}
                    </div>
                    <div className="text-gray-400">
                      {summary.googleBusiness.reviewsCount?.toLocaleString()}{' '}
                      {t('competitors.reviews')}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center p-4">
                    <div
                      className="text-4xl mb-2"
                      style={{
                        color:
                          summary.googleBusiness.rating >= 4
                            ? '#52c41a'
                            : summary.googleBusiness.rating >= 3
                            ? '#faad14'
                            : '#f5222d',
                      }}
                    >
                      {summary.googleBusiness.rating >= 4
                        ? 'Great'
                        : summary.googleBusiness.rating >= 3
                        ? 'Good'
                        : 'Poor'}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      ) : (
        <Empty description={t('competitors.noGoogleData')} />
      ),
    },
    {
      key: 'tech',
      label: (
        <span className="flex items-center gap-1">
          {platformIcons.tech} Tech Stack
        </span>
      ),
      children: techStack.length > 0 ? (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic
                  title={t('competitors.totalTechnologies')}
                  value={summary.techStack}
                />
              </Card>
            </Col>
            <Col span={16}>
              <Card title={t('competitors.categories')}>
                <div className="flex flex-wrap gap-2">
                  {summary.techCategories?.map((cat) => (
                    <Tag key={cat} color="blue">
                      {cat}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
          <Card title={t('competitors.technologies')}>
            <Table
              dataSource={techStack}
              columns={techColumns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </div>
      ) : (
        <Empty description={t('competitors.noTechData')} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card
            hoverable
            onClick={() => setActiveTab('amazon')}
            className={activeTab === 'amazon' ? 'border-blue-500' : ''}
          >
            <div className="text-center">
              {platformIcons.amazon}
              <div className="text-xl font-bold mt-2">
                {summary.amazon?.totalProducts || 0}
              </div>
              <div className="text-gray-400">{t('competitors.amazonProducts')}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card
            hoverable
            onClick={() => setActiveTab('google')}
            className={activeTab === 'google' ? 'border-blue-500' : ''}
          >
            <div className="text-center">
              {platformIcons.google}
              <div className="text-xl font-bold mt-2">
                {summary.googleBusiness?.rating || 'N/A'}
              </div>
              <div className="text-gray-400">{t('competitors.googleRating')}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card
            hoverable
            onClick={() => setActiveTab('tech')}
            className={activeTab === 'tech' ? 'border-blue-500' : ''}
          >
            <div className="text-center">
              {platformIcons.tech}
              <div className="text-xl font-bold mt-2">{summary.techStack || 0}</div>
              <div className="text-gray-400">{t('competitors.technologies')}</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card hoverable>
            <div className="text-center">
              {platformIcons.shopify}
              <div className="text-xl font-bold mt-2">
                {summary.shopify?.productsCount || 0}
              </div>
              <div className="text-gray-400">{t('competitors.shopifyProducts')}</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
}