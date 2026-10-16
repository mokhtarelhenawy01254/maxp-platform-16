import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lightbulb, Plus, Compass, Inbox, ExternalLink } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface DiscoveredItem {
  suggestedName: string;
  reason: string;
  matchedProducts: number;
  url?: string;
  category?: string;
  source?: string;
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
        setError(res.data?.error || t('competitors.errors.discoveryFailed'));
      }
    } catch {
      setError(t('competitors.errors.discoveryFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] bg-card border border-border/70 rounded-2xl shadow-2xl p-5 sm:p-6 text-foreground">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-foreground">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Compass className="size-4" />
            </div>
            <span>{t('competitors.autoDiscover.title')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          <div>
            <label className="block font-medium mb-1.5 text-foreground">{t('competitors.autoDiscover.category')}</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder={t('competitors.autoDiscover.categoryPlaceholder')}
              className="bg-background border-border/70 text-foreground focus:ring-1 focus:ring-primary rounded-lg text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{t('competitors.autoDiscover.maxResults')}</span>
              <span className="font-mono tabular-nums text-primary font-bold">{maxResults}</span>
            </div>
            <Slider min={1} max={10} value={[maxResults]} onValueChange={(v) => setMaxResults(v[0])} />
          </div>

          <Button onClick={handleDiscover} disabled={loading} className="w-full gap-2 font-bold text-xs py-2 rounded-lg active:scale-[0.98]">
            {loading ? <Loader2 className="animate-spin size-4" /> : <Lightbulb className="size-4" />}
            <span>{loading ? t('competitors.autoDiscover.discovering') : t('competitors.autoDiscover.discover')}</span>
          </Button>

          {loading && (
            <div className="flex flex-col items-center py-8 space-y-2">
              <Loader2 className="animate-spin size-6 text-primary" />
              <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="rounded-xl border border-destructive/20 bg-destructive/10">
              <AlertTitle className="text-xs font-bold">{t('common.error')}</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {data && !loading && (
            <div className="space-y-3 pt-1">
              <div className="flex gap-2 flex-wrap text-xs text-muted-foreground font-mono tabular-nums">
                <Badge variant="outline" className="border-border/70 rounded-md">
                  {t('competitors.autoDiscover.searchingTerms', { count: data.searchedTerms })}
                </Badge>
                <Badge variant="outline" className="border-border/70 rounded-md">
                  {t('competitors.autoDiscover.yourProductsCount', { count: data.yourProductCount })}
                </Badge>
              </div>

              {data.discovered.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 rounded-xl bg-muted/20 border border-border/60 p-6 space-y-2">
                  <Inbox className="size-8 mx-auto text-muted-foreground/60" />
                  <p className="text-xs">{t('competitors.autoDiscover.noResults')}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {data.discovered.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3.5 border border-border/60 rounded-xl bg-muted/15 gap-3 hover:border-border transition-colors">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-foreground">
                            {item.suggestedName}
                          </span>
                          {item.source && (
                            <Badge variant="secondary" className="text-[10px] py-0 rounded-md font-mono">
                              {item.source}
                            </Badge>
                          )}
                          {item.category && (
                            <Badge variant="outline" className="text-[10px] py-0 border-primary/30 text-primary rounded-md">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">{t('competitors.autoDiscover.reason')}:</span> {item.reason}
                        </div>
                        {item.url && (
                          <div className="text-[11px] font-mono text-primary flex items-center gap-1 truncate">
                            <ExternalLink className="size-3 shrink-0" />
                            <span className="truncate">{item.url}</span>
                          </div>
                        )}
                        <Badge variant="outline" className="border-border/70 text-muted-foreground font-mono tabular-nums text-[10px] rounded-md mt-1">
                          {t('competitors.autoDiscover.matchedProducts')}: {item.matchedProducts}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1 text-xs border-border/70 hover:bg-primary hover:text-primary-foreground transition active:scale-[0.98]" onClick={() => onAddCompetitor(item.suggestedName)}>
                        <Plus className="size-3.5" />
                        <span>{t('competitors.autoDiscover.add')}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {data.suggestion && (
                <Alert className="rounded-xl border border-primary/20 bg-primary/5 text-xs">
                  <AlertTitle className="text-xs font-bold text-foreground">{t('competitors.autoDiscover.suggestion')}</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground leading-relaxed">{data.suggestion}</AlertDescription>
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