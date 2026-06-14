import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lightbulb, Plus, Wifi, Inbox } from 'lucide-react';
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
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="text-blue-500 size-5" />
            <span>{t('competitors.autoDiscover.title')}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('competitors.autoDiscover.category')}</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder={t('competitors.autoDiscover.categoryPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('competitors.autoDiscover.maxResults')}: {maxResults}
            </label>
            <Slider min={1} max={10} value={[maxResults]} onValueChange={(v) => setMaxResults(v[0])} />
          </div>

          <Button onClick={handleDiscover} disabled={loading} className="w-full">
            <Lightbulb className="size-4" />
            {loading ? t('competitors.autoDiscover.discovering') : t('competitors.autoDiscover.discover')}
          </Button>

          {loading && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="animate-spin size-6" />
              <span className="mt-2 text-sm text-muted-foreground">{t('common.loading')}</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {data && !loading && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap text-sm text-muted-foreground">
                <Badge variant="outline">{t('competitors.autoDiscover.searchingTerms', { count: data.searchedTerms })}</Badge>
                <Badge variant="outline">{t('competitors.autoDiscover.yourProductsCount', { count: data.yourProductCount })}</Badge>
              </div>

              {data.discovered.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Inbox className="size-12 mx-auto mb-2" />
                  <p>{t('competitors.autoDiscover.noResults')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.discovered.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {t('competitors.autoDiscover.suggestedName')}: {item.suggestedName}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium">{t('competitors.autoDiscover.reason')}:</span> {item.reason}
                        </div>
                        <Badge variant="outline" className="border-blue-500 text-blue-500 mt-1">
                          {t('competitors.autoDiscover.matchedProducts')}: {item.matchedProducts}
                        </Badge>
                      </div>
                      <Button variant="link" className="shrink-0" onClick={() => onAddCompetitor(item.suggestedName)}>
                        <Plus className="size-4" />
                        {t('competitors.autoDiscover.add')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {data.suggestion && (
                <Alert>
                  <AlertTitle>{t('competitors.autoDiscover.suggestion')}</AlertTitle>
                  <AlertDescription>{data.suggestion}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoDiscoverModal;