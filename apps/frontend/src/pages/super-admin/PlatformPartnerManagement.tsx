import React, { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Tabs,
    Tab,
    Alert,
    Avatar,
    Stack,
    alpha,
    Tooltip,
    Divider,
    InputAdornment
} from "@mui/material";
import {
    Edit as EditIcon,
    TrendingUp as TrendingIcon,
    People as PeopleIcon,
    Wallet as WalletIcon,
    History as HistoryIcon,
    AccountBalance as BankIcon,
    Settings as SettingsIcon,
    Save as SaveIcon
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import toast from "react-hot-toast";
import { useTheme } from "../../hooks/useTheme";

const PlatformPartnerManagement = () => {
    const { formatPrice } = useCurrency();
    const { actualTheme } = useTheme();
    const isDark = actualTheme === "dark";

    const [activeTab, setActiveTab] = useState(0);
    const [stats, setStats] = useState<any>(null);
    const [partners, setPartners] = useState<any[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    // Settings State
    const [settings, setSettings] = useState<any>(null);
    const [settingsForm, setSettingsForm] = useState({
        level1Rate: 20,
        level2Rate: 5,
        level3Rate: 3,
        level4Rate: 1,
        minimumPayoutAmount: 100,
        termsAndConditions: ""
    });

    // Dialog States
    const [rankDialogOpen, setRankDialogOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<any>(null);
    const [newTitle, setNewTitle] = useState("");

    const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<any>(null);
    const [payoutStatus, setPayoutStatus] = useState("COMPLETED");

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, partnersRes, payoutsRes, settingsRes] = await Promise.all([
                apiClient.get("/platform-partners/admin/stats"),
                apiClient.get("/platform-partners/admin/partners"),
                apiClient.get("/platform-partners/admin/payouts"),
                apiClient.get("/platform-partners/admin/settings")
            ]);

            if (statsRes.data.status === "success") setStats(statsRes.data.data.stats);
            if (partnersRes.data.status === "success") setPartners(partnersRes.data.data.partners);
            if (payoutsRes.data.status === "success") setPayouts(payoutsRes.data.data.payouts);
            if (settingsRes.data.status === "success") {
                const s = settingsRes.data.data.settings;
                setSettings(s);
                setSettingsForm({
                    level1Rate: s.level1Rate,
                    level2Rate: s.level2Rate,
                    level3Rate: s.level3Rate,
                    level4Rate: s.level4Rate,
                    minimumPayoutAmount: Number(s.minimumPayoutAmount),
                    termsAndConditions: s.termsAndConditions || ""
                });
            }
        } catch (error: any) {
            toast.error("خطأ في تحميل البيانات");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRank = async () => {
        if (!selectedPartner || !newTitle) return;
        try {
            const response = await apiClient.put(`/platform-partners/admin/partners/${selectedPartner.id}/title`, {
                title: newTitle
            });
            if (response.data.status === "success") {
                toast.success("Partner rank updated");
                setRankDialogOpen(false);
                fetchData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update rank");
        }
    };

    const handleProcessPayout = async () => {
        if (!selectedPayout) return;
        try {
            const response = await apiClient.put(`/platform-partners/admin/payouts/${selectedPayout.id}`, {
                status: payoutStatus
            });
            if (response.data.status === "success") {
                toast.success(`Payout ${payoutStatus.toLowerCase()}`);
                setPayoutDialogOpen(false);
                fetchData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to process payout");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ACTIVE": return "success";
            case "PENDING": return "warning";
            case "COMPLETED": return "success";
            case "REJECTED": return "error";
            default: return "default";
        }
    };

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 1 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 800, color: isDark ? "#f8fafc" : "#1e293b" }}>
                إدارة برنامج الشركاء
            </Typography>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { label: "إجمالي العمولات", value: formatPrice(stats?.totalCommissionsDistributed || 0), icon: <WalletIcon />, color: "#10b981" },
                    { label: "إجمالي الشركاء", value: stats?.totalPartners || 0, icon: <PeopleIcon />, color: "#3b82f6" },
                    { label: "مدفوعات معلقة", value: formatPrice(stats?.totalPendingPayouts || 0), icon: <HistoryIcon />, color: "#f59e0b" },
                    { label: "نمو الشبكة", value: stats?.activeCompaniesCount || 0, icon: <TrendingIcon />, color: "#8b5cf6" }
                ].map((stat, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{
                            borderRadius: 4,
                            boxShadow: isDark ? "0 10px 15px -3px rgba(0,0,0,0.5)" : "0 4px 6px -1px rgba(0,0,0,0.1)",
                            bgcolor: isDark ? "#1e293b" : "#fff",
                            border: "1px solid",
                            borderColor: isDark ? alpha("#fff", 0.05) : alpha("#000", 0.05)
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b", mb: 1 }}>{stat.label}</Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 800 }}>{stat.value}</Typography>
                                    </Box>
                                    <Avatar sx={{ bgcolor: alpha(stat.color, 0.1), color: stat.color, width: 56, height: 56 }}>
                                        {stat.icon}
                                    </Avatar>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{
                width: "100%",
                borderRadius: 4,
                overflow: "hidden",
                bgcolor: isDark ? "#1e293b" : "#fff",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
            }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{
                        borderBottom: 1,
                        borderColor: "divider",
                        px: 2,
                        pt: 2,
                        "& .MuiTab-root": { fontWeight: 600, px: 4 }
                    }}
                >
                    <Tab label="الشركاء (PARTNERS)" />
                    <Tab label="طلبات السحب (PAYOUTS)" />
                    <Tab label="⚙️ الإعدادات (SETTINGS)" />
                </Tabs>

                <Box sx={{ p: 0 }}>
                    {activeTab === 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: isDark ? alpha("#fff", 0.02) : "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>الشريك</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>اللقب (Rank)</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>إجمالي الأرباح</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>الرصيد المتاح</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {partners.map((partner) => (
                                        <TableRow key={partner.id} hover>
                                            <TableCell>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar sx={{ bgcolor: "#3b82f6" }}>{partner.user?.firstName?.charAt(0)}</Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{partner.user?.firstName} {partner.user?.lastName}</Typography>
                                                        <Typography variant="caption" color="textSecondary">{partner.partnerCode}</Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={partner.title} size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
                                            </TableCell>
                                            <TableCell>{formatPrice(partner.totalEarnings)}</TableCell>
                                            <TableCell sx={{ color: "#3b82f6", fontWeight: 700 }}>{formatPrice(partner.pendingEarnings)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={partner.status}
                                                    color={getStatusColor(partner.status)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="تعديل الرتبة">
                                                    <IconButton onClick={() => { setSelectedPartner(partner); setNewTitle(partner.title); setRankDialogOpen(true); }}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : activeTab === 1 ? (
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: isDark ? alpha("#fff", 0.02) : "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>الشريك</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>المبلغ</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>الطريقة</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payouts.map((payout) => (
                                        <TableRow key={payout.id} hover>
                                            <TableCell>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{payout.partner?.user?.firstName} {payout.partner?.user?.lastName}</Typography>
                                                <Typography variant="caption" color="textSecondary">{payout.partner?.partnerCode}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 800, color: "#ef4444" }}>{formatPrice(payout.amount)}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <BankIcon fontSize="small" sx={{ color: "#64748b" }} />
                                                    <Typography variant="body2">{payout.method}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{new Date(payout.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Chip label={payout.status} color={getStatusColor(payout.status)} size="small" />
                                            </TableCell>
                                            <TableCell align="center">
                                                {payout.status === "PENDING" && (
                                                    <IconButton onClick={() => { setSelectedPayout(payout); setPayoutDialogOpen(true); }}>
                                                        <EditIcon />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        /* Settings Tab */
                        <Box sx={{ p: 4 }}>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                <SettingsIcon sx={{ color: "#8b5cf6" }} />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>إعدادات برنامج الشركاء</Typography>
                            </Stack>

                            <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
                                تحديد نِسَب العمولات يؤثر على جميع المدفوعات الجديدة فور الحفظ. المدفوعات السابقة لن تتأثر.
                            </Alert>

                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: isDark ? "#94a3b8" : "#475569" }}>
                                نِسَب العمولات لكل مستوى إحالة
                            </Typography>

                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                {[
                                    { key: "level1Rate", label: "المستوى الأول", desc: "الشريك المباشر - PARTNER", color: "#3b82f6" },
                                    { key: "level2Rate", label: "المستوى الثاني", desc: "يتطلب رتبة SENIOR_PARTNER", color: "#8b5cf6" },
                                    { key: "level3Rate", label: "المستوى الثالث", desc: "يتطلب رتبة MASTER_PARTNER", color: "#f59e0b" },
                                    { key: "level4Rate", label: "المستوى الرابع", desc: "يتطلب رتبة EXECUTIVE_PARTNER", color: "#10b981" },
                                ].map((level) => (
                                    <Grid key={level.key} size={{ xs: 12, sm: 6, md: 3 }}>
                                        <Card sx={{
                                            borderRadius: 3,
                                            border: `2px solid ${alpha(level.color, 0.3)}`,
                                            bgcolor: isDark ? alpha(level.color, 0.05) : alpha(level.color, 0.04)
                                        }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: level.color }}>{level.label}</Typography>
                                                <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1.5 }}>{level.desc}</Typography>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    fullWidth
                                                    value={settingsForm[level.key as keyof typeof settingsForm]}
                                                    onChange={(e) => setSettingsForm(prev => ({ ...prev, [level.key]: Number(e.target.value) }))}
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                                                    }}
                                                    inputProps={{ min: 0, max: 100, step: 0.5 }}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: isDark ? "#94a3b8" : "#475569" }}>
                                إعدادات المدفوعات
                            </Typography>

                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="الحد الأدنى لطلب السحب"
                                        type="number"
                                        fullWidth
                                        value={settingsForm.minimumPayoutAmount}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, minimumPayoutAmount: Number(e.target.value) }))}
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">ج.م</InputAdornment>
                                        }}
                                        inputProps={{ min: 0, step: 10 }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label="الشروط والأحكام (اختياري)"
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        value={settingsForm.termsAndConditions}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                                        placeholder="أدخل شروط وأحكام برنامج الشركاء هنا..."
                                    />
                                </Grid>
                            </Grid>

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={savingSettings ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                disabled={savingSettings}
                                onClick={async () => {
                                    try {
                                        setSavingSettings(true);
                                        const res = await apiClient.put("/platform-partners/admin/settings", settingsForm);
                                        if (res.data.status === "success") {
                                            toast.success("تم حفظ الإعدادات بنجاح ✅");
                                            fetchData();
                                        }
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.message || "فشل حفظ الإعدادات");
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                sx={{ bgcolor: "#8b5cf6", "&:hover": { bgcolor: "#7c3aed" }, px: 4 }}
                            >
                                حفظ الإعدادات
                            </Button>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Rank Dialog */}
            <Dialog open={rankDialogOpen} onClose={() => setRankDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>تعديل لقب الشريك</DialogTitle>
                <DialogContent>
                    <Box sx={{ py: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>اللقب الجديد</InputLabel>
                            <Select value={newTitle} label="اللقب الجديد" onChange={(e) => setNewTitle(e.target.value)}>
                                <MenuItem value="PARTNER">Partner</MenuItem>
                                <MenuItem value="SENIOR_PARTNER">Senior Partner</MenuItem>
                                <MenuItem value="EXECUTIVE_PARTNER">Executive Partner</MenuItem>
                                <MenuItem value="REGIONAL_DIRECTOR">Regional Director</MenuItem>
                            </Select>
                        </FormControl>
                        <Alert severity="info" sx={{ mt: 3 }}>
                            اللقب يحدد عمق العمولات (مستوى 1 إلى 4).
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setRankDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleUpdateRank}>حفظ التغييرات</Button>
                </DialogActions>
            </Dialog>

            {/* Payout Dialog */}
            <Dialog open={payoutDialogOpen} onClose={() => setPayoutDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>معالجة طلب السحب</DialogTitle>
                <DialogContent>
                    <Box sx={{ py: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>بيانات الشريك:</Typography>
                        <Typography variant="body2" color="textSecondary">
                            {selectedPayout?.partner?.user?.firstName} ({selectedPayout?.partner?.partnerCode})
                        </Typography>
                        <Typography variant="h6" sx={{ my: 2, color: "#ef4444", fontWeight: 800 }}>
                            {formatPrice(selectedPayout?.amount || 0)}
                        </Typography>

                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>تحديث الحالة</InputLabel>
                            <Select value={payoutStatus} label="تحديث الحالة" onChange={(e) => setPayoutStatus(e.target.value)}>
                                <MenuItem value="COMPLETED">مكتمل (تم التحويل)</MenuItem>
                                <MenuItem value="REJECTED">مرفوض</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPayoutDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color={payoutStatus === "COMPLETED" ? "success" : "error"} onClick={handleProcessPayout}>
                        تأكيد العملية
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PlatformPartnerManagement;
