import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import {
  AutoFixHigh as AutoFixHighIcon,
  Bolt as BoltIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Inventory2 as InventoryIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  areaLabels,
  marketplaceFeatureMap,
  statusLabels,
} from "../../config/marketplaceFeatureMap";
import {
  buildMarketplaceCoverage,
} from "./marketplaceCoverageUtils";
import type {
  CompanyCoverageSummary,
  CoverageCompany,
  CoverageFeatureEntry,
  MarketplaceCoverageStatus,
} from "./marketplaceCoverageUtils";

type CoverageApp = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  isPublic: boolean;
  category?: string;
  pricingModel?: string;
};

type CoverageApiPayload = {
  generatedAt: string;
  totals: {
    companies: number;
    returnedCompanies: number;
    marketplaceApps: number;
  };
  companies: CoverageCompany[];
  apps: CoverageApp[];
};

type CoverageApiResponse = {
  success: boolean;
  data: CoverageApiPayload;
};

type CompanyFilter = "all" | "risk" | "fallback" | "missing" | "clean";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const statusMeta: Record<
  MarketplaceCoverageStatus,
  { label: string; color: "default" | "success" | "warning" | "error" | "info" }
> = {
  core: { label: "Core", color: "default" },
  exact: { label: "تطبيق مثبت", color: "success" },
  fallback: { label: "Fallback قديم", color: "warning" },
  missing: { label: "ناقص للشركة", color: "error" },
  "catalog-missing": { label: "ناقص من الكتالوج", color: "error" },
};

const getRowTone = (summary: CompanyCoverageSummary) => {
  if (summary.counts.catalogMissing > 0 || summary.counts.missing > 0) {
    return "#dc2626";
  }
  if (summary.counts.fallback > 0) {
    return "#d97706";
  }
  return "#059669";
};

const getInstallableRows = (entries: CoverageFeatureEntry[]) =>
  entries.filter(
    (entry) =>
      entry.appSlug &&
      entry.catalogExists &&
      (entry.coverageStatus === "missing" || entry.coverageStatus === "fallback"),
  );

const MarketplaceCoverageCenter: React.FC = () => {
  const [payload, setPayload] = useState<CoverageApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CompanyFilter>("risk");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    company: CoverageCompany;
    entry: CoverageFeatureEntry;
  } | null>(null);

  const fetchCoverage = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await axios.get<CoverageApiResponse>(
        buildApiUrl("super-admin/marketplace-management/coverage"),
        { headers: getAuthHeaders() },
      );

      if (!response.data?.success) {
        throw new Error("Coverage API returned an unsuccessful response");
      }

      setPayload(response.data.data);
      setError(null);
    } catch (coverageError: unknown) {
      console.error("Marketplace coverage fetch failed", coverageError);
      const axiosError = coverageError as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        setError(i18n.t("superAdmin.marketplaceCoverage.noPermission"));
      } else if (axiosError.response?.status === 404) {
        setError(i18n.t("superAdmin.marketplaceCoverage.coverageUnavailable"));
      } else {
        setError(axiosError.response?.data?.message || i18n.t("superAdmin.marketplaceCoverage.loadFailed"));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoverage();
  }, [fetchCoverage]);

  const catalogAppsMap = useMemo(
    () =>
      new Map(
        (payload?.apps || [])
          .filter((app) => app.isActive && app.isPublic)
          .map((app) => [app.slug, app]),
      ),
    [payload?.apps],
  );

  const catalogAppSlugs = useMemo(
    () => Array.from(catalogAppsMap.keys()),
    [catalogAppsMap],
  );

  const companyCoverage = useMemo(
    () =>
      buildMarketplaceCoverage(
        payload?.companies || [],
        marketplaceFeatureMap,
        catalogAppSlugs,
      ),
    [catalogAppSlugs, payload?.companies],
  );

  useEffect(() => {
    if (!selectedCompanyId && companyCoverage[0]) {
      setSelectedCompanyId(companyCoverage[0].company.id);
      return;
    }

    if (
      selectedCompanyId &&
      companyCoverage.length > 0 &&
      !companyCoverage.some((summary) => summary.company.id === selectedCompanyId)
    ) {
      setSelectedCompanyId(companyCoverage[0]!.company.id);
    }
  }, [companyCoverage, selectedCompanyId]);

  const filteredCoverage = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companyCoverage.filter((summary) => {
      if (normalizedQuery) {
        const haystack = [
          summary.company.name,
          summary.company.email,
          summary.company.slug,
          summary.company.plan,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      if (filter === "clean") return summary.counts.risk === 0;
      if (filter === "risk") return summary.counts.risk > 0;
      if (filter === "fallback") return summary.counts.fallback > 0;
      if (filter === "missing") {
        return summary.counts.missing > 0 || summary.counts.catalogMissing > 0;
      }

      return true;
    });
  }, [companyCoverage, filter, query]);

  const selectedCoverage = useMemo(
    () =>
      companyCoverage.find((summary) => summary.company.id === selectedCompanyId) ||
      filteredCoverage[0] ||
      companyCoverage[0],
    [companyCoverage, filteredCoverage, selectedCompanyId],
  );

  const totals = useMemo(() => {
    const riskCompanies = companyCoverage.filter((summary) => summary.counts.risk > 0).length;
    const fallbackCompanies = companyCoverage.filter((summary) => summary.counts.fallback > 0).length;
    const missingCompanies = companyCoverage.filter(
      (summary) => summary.counts.missing > 0 || summary.counts.catalogMissing > 0,
    ).length;

    return {
      companies: companyCoverage.length,
      riskCompanies,
      fallbackCompanies,
      missingCompanies,
      cleanCompanies: companyCoverage.length - riskCompanies,
    };
  }, [companyCoverage]);

  const handleInstall = async (
    company: CoverageCompany,
    entry: CoverageFeatureEntry,
  ) => {
    if (!entry.appSlug) return;
    setConfirmDialog({ company, entry });
  };

  const executeInstall = async () => {
    if (!confirmDialog) return;
    const { company, entry } = confirmDialog;
    setConfirmDialog(null);
    if (!entry.appSlug) return;

    const key = `${company.id}:${entry.appSlug}`;
    setInstallingKey(key);
    try {
      const catalogApp = entry.appSlug ? catalogAppsMap.get(entry.appSlug) : null;
      const pricingModel = catalogApp?.pricingModel || "SUBSCRIPTION";
      await axios.post(
        buildApiUrl(
          `super-admin/marketplace-management/coverage/companies/${company.id}/apps/${entry.appSlug}/install`,
        ),
        { pricingModel },
        { headers: getAuthHeaders({ "Content-Type": "application/json" }) },
      );
      toast.success(i18n.t("superAdmin.marketplaceCoverage.activated"));
      await fetchCoverage({ quiet: true });
    } catch (installError: unknown) {
      console.error("Coverage install failed", installError);
      const message =
        (installError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        i18n.t("superAdmin.marketplaceCoverage.activateFailed");
      toast.error(message);
    } finally {
      setInstallingKey(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ direction: "rtl" }}>
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          mb: 3,
          p: { xs: 3, md: 4 },
          borderRadius: 5,
          color: "#fff",
          background:
            "radial-gradient(circle at 15% 20%, rgba(245, 158, 11, 0.38), transparent 32%), linear-gradient(135deg, #111827 0%, #1f2937 48%, #064e3b 100%)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={3}>
            <Box>
              <Chip
                icon={<ShieldIcon />}
                label="Marketplace Coverage Center"
                sx={{
                  mb: 2,
                  bgcolor: "rgba(255,255,255,.14)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.22)",
                }}
              />
              <Typography variant="h3" fontWeight={900} sx={{ maxWidth: 760 }}>
                غرفة مراقبة التطبيقات الناقصة لكل شركة
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 760, color: "rgba(255,255,255,.78)" }}>
                الصفحة دي بتكشف الشركات اللي عندها أجزاء ظاهرة بفallback قديم أو ناقص لها التطبيق
                الفعلي، وتسمح بتفعيل التطبيق المطلوب بأمان من السوبر أدمن.
              </Typography>
            </Box>
            <Stack alignItems={{ xs: "stretch", md: "flex-end" }} justifyContent="space-between" gap={2}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => fetchCoverage({ quiet: true })}
                disabled={refreshing}
                sx={{
                  bgcolor: "#f59e0b",
                  color: "#111827",
                  fontWeight: 800,
                  "&:hover": { bgcolor: "#fbbf24" },
                }}
              >
                تحديث التغطية
              </Button>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,.65)" }}>
                آخر قراءة: {payload?.generatedAt ? new Date(payload.generatedAt).toLocaleString("ar-EG") : "-"}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: "الشركات المقروءة",
            value: totals.companies,
            icon: <InventoryIcon />,
            color: "#2563eb",
          },
          {
            label: "تحتاج مراجعة",
            value: totals.riskCompanies,
            icon: <WarningAmberIcon />,
            color: "#d97706",
          },
          {
            label: "Fallback قديم",
            value: totals.fallbackCompanies,
            icon: <BoltIcon />,
            color: "#f59e0b",
          },
          {
            label: "نظيفة",
            value: totals.cleanCompanies,
            icon: <CheckCircleIcon />,
            color: "#059669",
          },
        ].map((card) => (
          <Card
            key={card.label}
            elevation={0}
            sx={{
              borderRadius: 4,
              border: "1px solid",
              borderColor: alpha(card.color, 0.22),
              background: `linear-gradient(135deg, ${alpha(card.color, 0.10)}, #fff 56%)`,
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={900}>
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color }}>{card.icon}</Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 0.85fr) minmax(0, 1.65fr)" },
          gap: 3,
        }}
      >
        <Box>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: "1px solid #e5e7eb" }}>
            <Stack gap={2} sx={{ mb: 2 }}>
              <TextField
                label="بحث عن شركة"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                select
                label="فلتر الحالة"
                value={filter}
                onChange={(event) => setFilter(event.target.value as CompanyFilter)}
                size="small"
              >
                <MenuItem value="risk">تحتاج مراجعة</MenuItem>
                <MenuItem value="fallback">Fallback فقط</MenuItem>
                <MenuItem value="missing">ناقص تطبيق</MenuItem>
                <MenuItem value="clean">نظيفة</MenuItem>
                <MenuItem value="all">كل الشركات</MenuItem>
              </TextField>
            </Stack>

            <Stack gap={1.5} sx={{ maxHeight: 640, overflow: "auto", pr: 0.5 }}>
              {filteredCoverage.map((summary) => {
                const active = selectedCoverage?.company.id === summary.company.id;
                const tone = getRowTone(summary);
                return (
                  <Button
                    key={summary.company.id}
                    onClick={() => setSelectedCompanyId(summary.company.id)}
                    sx={{
                      justifyContent: "stretch",
                      textAlign: "right",
                      p: 0,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: active ? alpha(tone, 0.45) : "#e5e7eb",
                      bgcolor: active ? alpha(tone, 0.08) : "#fff",
                      color: "text.primary",
                    }}
                  >
                    <Box sx={{ width: "100%", p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={900} noWrap>
                            {summary.company.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {summary.company.email || summary.company.slug || "بدون بريد"}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${summary.coverageScore}%`}
                          sx={{ bgcolor: alpha(tone, 0.12), color: tone, fontWeight: 900 }}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={summary.coverageScore}
                        sx={{
                          mt: 1.5,
                          height: 7,
                          borderRadius: 99,
                          bgcolor: "#f3f4f6",
                          "& .MuiLinearProgress-bar": { bgcolor: tone },
                        }}
                      />
                      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                        <Chip size="small" label={`ناقص ${summary.counts.missing}`} />
                        <Chip size="small" label={`Fallback ${summary.counts.fallback}`} />
                        <Chip size="small" label={`Exact ${summary.counts.exact}`} />
                      </Stack>
                    </Box>
                  </Button>
                );
              })}
              {filteredCoverage.length === 0 && (
                <Alert severity="info">لا توجد شركات مطابقة للفلتر الحالي.</Alert>
              )}
            </Stack>
          </Paper>
        </Box>

        <Box>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #e5e7eb" }}>
            {selectedCoverage ? (
              <>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography variant="h5" fontWeight={900}>
                      {selectedCoverage.company.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedCoverage.company.email || "بدون بريد"} • الخطة: {selectedCoverage.company.plan || "-"}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip color="success" label={`مثبت مباشر ${selectedCoverage.counts.exact}`} />
                    <Chip color="warning" label={`Fallback ${selectedCoverage.counts.fallback}`} />
                    <Chip color="error" label={`ناقص ${selectedCoverage.counts.missing + selectedCoverage.counts.catalogMissing}`} />
                  </Stack>
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 2 }}>
                  <Box>
                    <Typography fontWeight={900}>الأجزاء التي تحتاج قرار</Typography>
                    <Typography variant="body2" color="text.secondary">
                      نعرض فقط الـ missing/fallback/catalog-missing عشان القرار يبقى واضح وسريع.
                    </Typography>
                  </Box>
                  <Chip
                    icon={<AutoFixHighIcon />}
                    label={`${getInstallableRows(selectedCoverage.entries).length} قابل للتفعيل`}
                    color="info"
                    variant="outlined"
                  />
                </Stack>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>الجزء</TableCell>
                        <TableCell>المجال</TableCell>
                        <TableCell>التطبيق المطلوب</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell align="center">إجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCoverage.entries
                        .filter((entry) => entry.coverageStatus !== "core" && entry.coverageStatus !== "exact")
                        .map((entry) => {
                          const installable =
                            entry.appSlug &&
                            entry.catalogExists &&
                            (entry.coverageStatus === "missing" || entry.coverageStatus === "fallback");
                          const installKey = `${selectedCoverage.company.id}:${entry.appSlug}`;

                          return (
                            <TableRow key={entry.id} hover>
                              <TableCell>
                                <Typography fontWeight={800}>{entry.label}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.description}
                                </Typography>
                              </TableCell>
                              <TableCell>{areaLabels[entry.area]}</TableCell>
                              <TableCell>
                                <Stack gap={0.5}>
                                  <Typography variant="body2" fontWeight={800}>
                                    {entry.appLabel || entry.appSlug || statusLabels.core}
                                  </Typography>
                                  {entry.legacyGate && (
                                    <Typography variant="caption" color="text.secondary">
                                      fallback: {entry.legacyGate}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={statusMeta[entry.coverageStatus].color}
                                  label={statusMeta[entry.coverageStatus].label}
                                  icon={
                                    entry.coverageStatus === "catalog-missing" ||
                                    entry.coverageStatus === "missing" ? (
                                      <ErrorOutlineIcon />
                                    ) : undefined
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={!installable || installingKey === installKey}
                                  onClick={() => handleInstall(selectedCoverage.company, entry)}
                                  sx={{ borderRadius: 99, fontWeight: 800 }}
                                >
                                  {installingKey === installKey ? "جاري..." : "تفعيل"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {selectedCoverage.counts.risk === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Alert severity="success">
                              هذه الشركة نظيفة: كل الأجزاء القابلة للتطبيق مثبتة مباشرة.
                            </Alert>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Alert severity="info">لا توجد شركة محددة للعرض.</Alert>
            )}
          </Paper>
        </Box>
      </Box>

      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>{i18n.t("superAdmin.marketplaceCoverage.confirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {i18n.t("superAdmin.marketplaceCoverage.confirmPrefix")}{" "}
            <strong>{confirmDialog?.entry?.appLabel || confirmDialog?.entry?.appSlug}</strong>{" "}
            {i18n.t("superAdmin.marketplaceCoverage.confirmSuffix", { companyName: confirmDialog?.company?.name || "" })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>{i18n.t("superAdmin.marketplaceCoverage.cancel")}</Button>
          <Button variant="contained" onClick={executeInstall} autoFocus>
            {i18n.t("superAdmin.marketplaceCoverage.confirmActivate")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MarketplaceCoverageCenter;
