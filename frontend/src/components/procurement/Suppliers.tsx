import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  MenuItem,
  InputAdornment,
  Pagination,
  Rating,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import {
  ProcurementMobileCard,
  ProcurementMobileState,
} from "./ProcurementMobileCard";
import { desktopTableSx, mobileListSx } from "./procurementResponsiveSx";

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  commercialRegister?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currentBalance: number;
  rating?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    purchaseOrders: number;
    purchaseInvoices: number;
  };
}

const Suppliers: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string) => String(t(key));
  const isRtl = i18n.language === "ar";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    country: "Egypt",
    taxNumber: "",
    commercialRegister: "",
    paymentTerms: "",
    creditLimit: "",
    rating: 0,
    notes: "",
    isActive: true,
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/procurement/suppliers", {
        params: { page, limit: 20, search: searchTerm },
      });
      setSuppliers(response.data.suppliers);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        mobile: supplier.mobile || "",
        address: supplier.address || "",
        city: supplier.city || "",
        country: supplier.country || "Egypt",
        taxNumber: supplier.taxNumber || "",
        commercialRegister: supplier.commercialRegister || "",
        paymentTerms: supplier.paymentTerms || "",
        creditLimit: supplier.creditLimit?.toString() || "",
        rating: supplier.rating || 0,
        notes: supplier.notes || "",
        isActive: supplier.isActive,
      });
    } else {
      setSelectedSupplier(null);
      setFormData({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        mobile: "",
        address: "",
        city: "",
        country: "Egypt",
        taxNumber: "",
        commercialRegister: "",
        paymentTerms: "",
        creditLimit: "",
        rating: 0,
        notes: "",
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSupplier(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedSupplier) {
        await apiClient.put(
          `/procurement/suppliers/${selectedSupplier.id}`,
          formData,
        );
      } else {
        await apiClient.post("/procurement/suppliers", formData);
      }
      fetchSuppliers();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(tr("procurement.suppliers.deleteConfirm"))) {
      try {
        await apiClient.delete(`/procurement/suppliers/${id}`);
        fetchSuppliers();
      } catch (error) {
        console.error("Error deleting supplier:", error);
      }
    }
  };

  const handleViewDetails = async (supplier: Supplier) => {
    try {
      const response = await apiClient.get(
        `/procurement/suppliers/${supplier.id}`,
      );
      setSelectedSupplier(response.data);
      setOpenViewDialog(true);
    } catch (error) {
      console.error("Error fetching supplier details:", error);
    }
  };

  return (
    <Box sx={{ p: 3 }} dir={isRtl ? "rtl" : "ltr"}>
      <Box
        sx={{
          alignItems: "center",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h4">{t("procurement.suppliers.title")}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
        >
          {t("procurement.suppliers.addNew")}
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder={tr("procurement.suppliers.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={desktopTableSx}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnName")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnContact")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnPhone")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnEmail")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnBalance")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnRating")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnStatus")}
              </TableCell>
              <TableCell align={isRtl ? "right" : "left"}>
                {t("procurement.suppliers.columnActions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell align={isRtl ? "right" : "left"}>
                    {supplier.name}
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    {supplier.contactPerson || "-"}
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    {supplier.phone || supplier.mobile || "-"}
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    {supplier.email || "-"}
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    {Number(supplier.currentBalance).toFixed(2)} EGP
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    <Rating
                      value={supplier.rating || 0}
                      readOnly
                      size="small"
                    />
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    <Chip
                      label={
                        supplier.isActive
                          ? t("procurement.suppliers.statusActive")
                          : t("procurement.suppliers.statusInactive")
                      }
                      color={supplier.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align={isRtl ? "right" : "left"}>
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(supplier)}
                      title={tr("procurement.suppliers.viewDetails")}
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(supplier)}
                      title={tr("common.edit")}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(supplier.id)}
                      title={tr("common.delete")}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={mobileListSx}>
        {loading ? (
          <ProcurementMobileState>{t("common.loading")}</ProcurementMobileState>
        ) : suppliers.length === 0 ? (
          <ProcurementMobileState>{t("common.noData")}</ProcurementMobileState>
        ) : (
          suppliers.map((supplier) => (
            <ProcurementMobileCard
              key={supplier.id}
              eyebrow={supplier.contactPerson || t("procurement.suppliers.columnContact")}
              title={supplier.name}
              subtitle={supplier.email || supplier.phone || supplier.mobile || "-"}
              status={
                <Chip
                  label={
                    supplier.isActive
                      ? t("procurement.suppliers.statusActive")
                      : t("procurement.suppliers.statusInactive")
                  }
                  color={supplier.isActive ? "success" : "default"}
                  size="small"
                />
              }
              fields={[
                {
                  label: t("procurement.suppliers.columnPhone"),
                  value: supplier.phone || supplier.mobile || "-",
                },
                {
                  label: t("procurement.suppliers.columnBalance"),
                  value: `${Number(supplier.currentBalance).toFixed(2)} EGP`,
                  emphasis: true,
                },
                {
                  label: t("procurement.suppliers.columnRating"),
                  value: (
                    <Rating value={supplier.rating || 0} readOnly size="small" />
                  ),
                },
                {
                  label: t("procurement.suppliers.labelCity"),
                  value: supplier.city || supplier.country || "-",
                },
              ]}
              actions={
                <>
                  <IconButton
                    aria-label={tr("procurement.suppliers.viewDetails")}
                    size="small"
                    onClick={() => handleViewDetails(supplier)}
                    title={tr("procurement.suppliers.viewDetails")}
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    aria-label={tr("common.edit")}
                    size="small"
                    onClick={() => handleOpenDialog(supplier)}
                    title={tr("common.edit")}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    aria-label={tr("common.delete")}
                    size="small"
                    onClick={() => handleDelete(supplier.id)}
                    title={tr("common.delete")}
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              }
            />
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        dir={isRtl ? "rtl" : "ltr"}
      >
        <DialogTitle>
          {selectedSupplier
            ? t("procurement.suppliers.editTitle")
            : t("procurement.suppliers.addNew")}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelName")}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelContact")}
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelEmail")}
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelPhone")}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelMobile")}
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelCity")}
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelCountry")}
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelTaxNumber")}
                value={formData.taxNumber}
                onChange={(e) =>
                  setFormData({ ...formData, taxNumber: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelCommercialRegister")}
                value={formData.commercialRegister}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commercialRegister: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelCreditLimit")}
                type="number"
                value={formData.creditLimit}
                onChange={(e) =>
                  setFormData({ ...formData, creditLimit: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelAddress")}
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelPaymentTerms")}
                multiline
                rows={2}
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData({ ...formData, paymentTerms: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("procurement.suppliers.labelNotes")}
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography>
                  {t("procurement.suppliers.labelRating")}
                </Typography>
                <Rating
                  value={formData.rating}
                  onChange={(_, value) =>
                    setFormData({ ...formData, rating: value || 0 })
                  }
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label={t("procurement.suppliers.labelStatus")}
                value={formData.isActive}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isActive: e.target.value === "true",
                  })
                }
              >
                <MenuItem value="true">
                  {t("procurement.suppliers.statusActive")}
                </MenuItem>
                <MenuItem value="false">
                  {t("procurement.suppliers.statusInactive")}
                </MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
        dir={isRtl ? "rtl" : "ltr"}
      >
        <DialogTitle>{t("procurement.suppliers.viewTitle")}</DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.columnName")}
                </Typography>
                <Typography variant="body1">{selectedSupplier.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.columnContact")}
                </Typography>
                <Typography variant="body1">
                  {selectedSupplier.contactPerson || "-"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.columnEmail")}
                </Typography>
                <Typography variant="body1">
                  {selectedSupplier.email || "-"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.columnPhone")}
                </Typography>
                <Typography variant="body1">
                  {selectedSupplier.phone || "-"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.columnBalance")}
                </Typography>
                <Typography variant="body1">
                  {Number(selectedSupplier.currentBalance).toFixed(2)} EGP
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.columnRating")}
                </Typography>
                <Rating value={selectedSupplier.rating || 0} readOnly />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.labelAddress")}
                </Typography>
                <Typography variant="body1">
                  {selectedSupplier.address || "-"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  {t("procurement.suppliers.labelNotes")}
                </Typography>
                <Typography variant="body1">
                  {selectedSupplier.notes || "-"}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Suppliers;
