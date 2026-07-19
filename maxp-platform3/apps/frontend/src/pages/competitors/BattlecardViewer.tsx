import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import CompetitorStatusBar, { type CompetitorStatus } from './CompetitorStatusBar';
import { updateCompetitorStatus } from './useCompetitorStatus';
import i18n from "../../i18n";

interface PriceComparisonRow {
  competitorProduct: string;
  competitorPrice: number | null;
  yourProduct: string | null;
  yourPrice: number | null;
  priceDiff: string | null;
}

interface BattlecardData {
  competitor: {
    id: string;
    name: string;
    platform: string;
    url: string;
    status: CompetitorStatus;
  };
  metrics: {
    theirProducts: number;
    theirAds: number;
    yourProducts: number;
    priceComparisonCount: number;
  };
  lastReportDate: string | null;
  reportInsights: Record<string, unknown>;
  priceComparison: PriceComparisonRow[];
  gaps: { name: string; price: number }[];
}

const DiffBadge = ({ value }: { value: string | null }) => {
  if (value === null) return <Badge variant="outline">--</Badge>;
  const num = parseFloat(value);
  if (num > 0)
    return (
      <Badge variant="destructive">
        <TrendingUp className="inline w-3 h-3 ltr:mr-1 rtl:ml-1" />
        {value}%
      </Badge>
    );
  if (num < 0)
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <TrendingDown className="inline w-3 h-3 ltr:mr-1 rtl:ml-1" />
        {value}%
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Minus className="inline w-3 h-3 ltr:mr-1 rtl:ml-1" />0%
    </Badge>
  );
};

const BattlecardViewer: React.FC = () => {
  const { t } = useTranslation();
  const { competitorId } = useParams<{ competitorId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BattlecardData | null>(null);

  useEffect(() => {
    if (!competitorId) return;
    setLoading(true);
    apiClient
      .get<{ success: boolean; data: BattlecardData }>(
        `/api/v1/competitors/${competitorId}/battlecard?format=structured`
      )
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
        } else {
          setData(null);
        }
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [competitorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        {t("competitors.battlecard.noBattlecardData")}
      </div>
    );
  }

  const hasInsights = data.reportInsights && Object.keys(data.reportInsights).length > 0;

  return (
    <div dir={i18n.dir()} className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {i18n.dir() === 'rtl' ? <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("competitors.battlecard.title")}: {data.competitor.name}
        </h1>
        <CompetitorStatusBar
          currentStatus={data.competitor.status}
          competitorId={data.competitor.id}
          onChange={(newStatus) => updateCompetitorStatus(data.competitor.id, newStatus)}
          size="md"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("competitors.battlecard.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-500">{t("competitors.platform")}</div>
              <div className="text-lg font-semibold">{data.competitor.platform || "--"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t("competitors.products")}</div>
              <div className="text-lg font-semibold">{data.metrics.theirProducts}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t("competitors.battlecard.yourProduct")}</div>
              <div className="text-lg font-semibold">{data.metrics.yourProducts}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t("competitors.battlecard.priceComparison")}</div>
              <div className="text-lg font-semibold">{data.metrics.priceComparisonCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("competitors.battlecard.priceComparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("competitors.battlecard.yourProduct")}</TableHead>
                <TableHead>{t("competitors.battlecard.yourPrice")}</TableHead>
                <TableHead>{t("competitors.battlecard.theirProduct")}</TableHead>
                <TableHead>{t("competitors.battlecard.theirPrice")}</TableHead>
                <TableHead>{t("competitors.battlecard.diffPercent")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.priceComparison.map((row, idx) => (
                <TableRow key={`${row.yourProduct}-${row.competitorProduct}-${idx}`}>
                  <TableCell>{row.yourProduct || "--"}</TableCell>
                  <TableCell>{row.yourPrice != null ? `${row.yourPrice.toFixed(2)}` : "--"}</TableCell>
                  <TableCell>{row.competitorProduct}</TableCell>
                  <TableCell>{row.competitorPrice != null ? `${row.competitorPrice.toFixed(2)}` : "--"}</TableCell>
                  <TableCell>
                    <DiffBadge value={row.priceDiff} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("competitors.battlecard.marketGaps")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.gaps.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              {t("competitors.noGaps")}
            </div>
          ) : (
            <ul className="space-y-2">
              {data.gaps.map((gap, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">{gap.name}</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {gap.price != null ? `${gap.price.toFixed(2)}` : "--"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {hasInsights && (
        <Card>
          <CardHeader>
            <CardTitle>{t("competitors.insights")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(data.reportInsights as any).newProducts != null && (
                <div>
                  <div className="text-sm text-gray-500">{t("competitors.newProducts")}</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {(data.reportInsights as any).newProducts}
                  </div>
                </div>
              )}
              {(data.reportInsights as any).priceChanges != null && (
                <div>
                  <div className="text-sm text-gray-500">{t("competitors.priceChanges")}</div>
                  <div className="text-lg font-semibold text-yellow-600">
                    {(data.reportInsights as any).priceChanges}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BattlecardViewer;
