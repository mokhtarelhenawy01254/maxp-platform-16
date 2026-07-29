import React, { useState, useEffect } from "react";
import i18n from "../../../../i18n";
import {
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { companyAwareApi } from "../../../../services/companyAwareApi";
import axios from "axios";
import { getApiUrl } from "../../../../config/environment";
import { tokenManager } from "../../../../utils/tokenManager";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Asset {
  id: string;
  name: string;
  code: string;
}

interface AssetDocument {
  id: string;
  assetId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
  asset?: Asset;
}

interface DocumentType {
  value: string;
  label: string;
  labelEn: string;
  icon: string;
}

const DocumentsSection: React.FC = () => {
  const PAGE_SIZE = 12;
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentTypes] = useState<DocumentType[]>([
    {
      value: "image",
      label: "صور الأصل",
      labelEn: "Asset Images",
      icon: "photo",
    },
    {
      value: "invoice",
      label: "فاتورة الشراء",
      labelEn: "Purchase Invoice",
      icon: "document",
    },
    {
      value: "warranty",
      label: "شهادة الضمان",
      labelEn: "Warranty Certificate",
      icon: "shield",
    },
    {
      value: "manual",
      label: "دليل الاستخدام",
      labelEn: "User Manual",
      icon: "book",
    },
    {
      value: "other",
      label: "معاينة وتحميل المرفقات",
      labelEn: "Preview & Download",
      icon: "document",
    },
  ]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("all");
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string }>({
    open: false,
    src: "",
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    assetId: "",
    documentType: "image",
    fileName: "",
    fileUrl: "",
    description: "",
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchAllDocuments({ page: 1, append: false });
  }, [activeTab, selectedAsset, debouncedSearch]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Reload assets when modal opens
  useEffect(() => {
    if (showUploadModal) {
      fetchAssets();
    }
  }, [showUploadModal]);

  const normalizeDoc = (doc: any): AssetDocument => ({
    ...doc,
    documentType: (doc as any).documentType || (doc as any).type,
    uploadedAt: (doc as any).uploadedAt || (doc as any).createdAt,
    asset: (doc as any).asset || (doc as any).assets,
  });

  const fetchAllDocuments = async ({
    page: requestedPage = 1,
    append = false,
  }: {
    page?: number;
    append?: boolean;
  } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");
      const response = await companyAwareApi.get("/hr/assets/documents/all", {
        params: {
          page: requestedPage,
          limit: PAGE_SIZE,
          type: activeTab !== "all" ? activeTab : undefined,
          assetId: selectedAsset !== "all" ? selectedAsset : undefined,
          search: debouncedSearch || undefined,
        },
      });
      if (response.data.success) {
        const docs = (response.data.data.documents || []).map((d: any) =>
          normalizeDoc(d),
        );
        setDocuments((prev) => (append ? [...prev, ...docs] : docs));
        const pagination = response.data.data.pagination || {};
        const totalPages =
          pagination.totalPages ||
          (docs.length < PAGE_SIZE ? requestedPage : requestedPage + 1);
        setPage(requestedPage);
        setHasMore(requestedPage < totalPages && docs.length > 0);
      }
    } catch (err: any) {
      // If endpoint doesn't exist, try fetching from each asset
      console.log("Fetching documents from all assets...");
      try {
        const assetsResponse = await companyAwareApi.get("/hr/assets");
        if (assetsResponse.data.success) {
          const allDocs: AssetDocument[] = [];
          const assetsData = assetsResponse.data.data || [];
          for (const asset of assetsData) {
            try {
              const docsResponse = await companyAwareApi.get(
                `/hr/assets/${asset.id}/documents`,
              );
              if (docsResponse.data.success) {
                const docs = docsResponse.data.data.documents || [];
                docs.forEach((doc: AssetDocument) => {
                  allDocs.push({ ...normalizeDoc(doc), asset });
                });
              }
            } catch (e) {
              // Skip if no documents
            }
          }
          setDocuments(allDocs);
          setHasMore(false);
          setPage(requestedPage);
        }
      } catch (e) {
        setError("فشل في تحميل المستندات");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchAssets = async () => {
    try {
      setAssetsLoading(true);
      console.log("🔄 Fetching assets...");
      const response = await companyAwareApi.get("/hr/assets", {
        params: { limit: 200 },
      });
      console.log("📦 Assets API response:", response.data);

      if (response.data.success) {
        // API returns data directly as array (same as AssetList.tsx)
        const assetsData = response.data.data || [];
        console.log("✅ Assets loaded:", assetsData.length, assetsData);
        setAssets(assetsData);
      } else {
        console.error("❌ Assets API returned success: false", response.data);
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch assets:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      const maxSize = 20 * 1024 * 1024; // 20MB
      const isAllowed =
        allowedTypes.some((t) => file.type.startsWith(t.replace("/*", ""))) ||
        file.type === "";
      if (!isAllowed) {
        alert(i18n.t("DocumentsSection.msg_8a25"));
        return;
      }
      if (file.size > maxSize) {
        alert(i18n.t("DocumentsSection.msg_fd1d"));
        return;
      }
      setSelectedFile(file);
      setUploadForm((prev) => ({ ...prev, fileName: file.name }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.assetId) {
      alert(i18n.t("DocumentsSection.msg_4ae4"));
      return;
    }
    if (!selectedFile && !uploadForm.fileUrl) {
      alert(i18n.t("DocumentsSection.msg_a01e"));
      return;
    }
    if (!uploadForm.fileName) {
      alert(i18n.t("DocumentsSection.please_name_78ee"));
      return;
    }

    setUploading(true);
    try {
      let fileUrl = uploadForm.fileUrl;
      const mimeType = selectedFile?.type;
      const fileSize = selectedFile?.size;

      // If file is selected, upload it first
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        // Get auth token
        const token = tokenManager.getAccessToken();
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        const uploadResponse = await axios.post(
          `${getApiUrl()}/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
            params: {
              companyId: user.companyId,
            },
          },
        );

        if (uploadResponse.data?.success) {
          fileUrl =
            uploadResponse.data.filePath ||
            uploadResponse.data.url ||
            uploadResponse.data.data?.url ||
            uploadResponse.data.fileUrl;
        } else {
          throw new Error("فشل في رفع الملف");
        }
      }

      if (!fileUrl) {
        alert(i18n.t("DocumentsSection.msg_a01e"));
        setUploading(false);
        return;
      }

      console.log("📤 Sending document data:", {
        assetId: uploadForm.assetId,
        documentType: uploadForm.documentType,
        fileName: uploadForm.fileName,
        fileUrl: fileUrl,
        mimeType,
        fileSize,
      });

      const response = await companyAwareApi.post(
        `/hr/assets/${uploadForm.assetId}/documents`,
        {
          documentType: uploadForm.documentType,
          fileName: uploadForm.fileName,
          fileUrl: fileUrl,
          description: uploadForm.description,
          mimeType,
          fileSize,
        },
      );

      if (response.data.success) {
        const newDoc = normalizeDoc(response.data.data);
        const asset = assets.find((a) => a.id === uploadForm.assetId);
        setDocuments((prev) => [{ ...newDoc, asset }, ...prev]);
        setShowUploadModal(false);
        resetUploadForm();
        alert(i18n.t("DocumentsSection.msg_7330"));
        // Refresh first page to keep pagination + filters in sync
        fetchAllDocuments({ page: 1, append: false });
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      alert(err.response?.data?.message || err.message || i18n.t("DocumentsSection.msg_3c68"));
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      assetId: "",
      documentType: "image",
      fileName: "",
      fileUrl: "",
      description: "",
    });
    setSelectedFile(null);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستند؟")) return;

    try {
      await companyAwareApi.delete(`/hr/assets/documents/${docId}`);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.response?.data?.message || "فشل في حذف المستند");
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <PhotoIcon className="h-10 w-10 text-blue-500" />;
      case "invoice":
        return <DocumentTextIcon className="h-10 w-10 text-green-500" />;
      case "warranty":
        return <ShieldCheckIcon className="h-10 w-10 text-purple-500" />;
      case "manual":
        return <BookOpenIcon className="h-10 w-10 text-orange-500" />;
      default:
        return <DocumentIcon className="h-10 w-10 text-gray-500" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type);
    return docType?.label || type;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const buildFileUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return encodeURI(url);
    const base = getApiUrl().replace("/api/v1", "");
    const cleanPath = url.replace(/^\/+/, "");
    return encodeURI(`${base}/${cleanPath}`);
  };

  // Filter documents
  let filteredDocuments = documents;

  if (activeTab !== "all") {
    filteredDocuments = filteredDocuments.filter(
      (d) => d.documentType === activeTab,
    );
  }

  if (selectedAsset !== "all") {
    filteredDocuments = filteredDocuments.filter(
      (d) => d.assetId === selectedAsset,
    );
  }

  if (debouncedSearch) {
    const query = debouncedSearch.toLowerCase();
    filteredDocuments = filteredDocuments.filter(
      (d) =>
        d.fileName.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.asset?.name.toLowerCase().includes(query),
    );
  }

  const tabs = [
    { id: "all", label: "الكل", count: documents.length, color: "gray" },
    {
      id: "image",
      label: "صور الأصول",
      count: documents.filter((d) => d.documentType === "image").length,
      color: "blue",
    },
    {
      id: "invoice",
      label: "فواتير الشراء",
      count: documents.filter((d) => d.documentType === "invoice").length,
      color: "green",
    },
    {
      id: "warranty",
      label: "شهادات الضمان",
      count: documents.filter((d) => d.documentType === "warranty").length,
      color: "purple",
    },
    {
      id: "manual",
      label: "أدلة الاستخدام",
      count: documents.filter((d) => d.documentType === "manual").length,
      color: "orange",
    },
    {
      id: "other",
      label: "أخرى",
      count: documents.filter((d) => d.documentType === "other").length,
      color: "gray",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; light: string }> =
  {
    gray: {
      bg: "bg-gray-600",
      text: "text-gray-600",
      light: "bg-gray-100 dark:bg-gray-700",
    },
    blue: {
      bg: "bg-blue-600",
      text: "text-blue-600",
      light: "bg-blue-100 dark:bg-blue-900/30",
    },
    green: {
      bg: "bg-green-600",
      text: "text-green-600",
      light: "bg-green-100 dark:bg-green-900/30",
    },
    purple: {
      bg: "bg-purple-600",
      text: "text-purple-600",
      light: "bg-purple-100 dark:bg-purple-900/30",
    },
    orange: {
      bg: "bg-orange-600",
      text: "text-orange-600",
      light: "bg-orange-100 dark:bg-orange-900/30",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DocumentIcon className="h-7 w-7 text-indigo-600" />
            الوثائق والمرفقات
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            إدارة جميع مستندات الأصول في مكان واحد
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          <PlusIcon className="h-5 w-5" />
          رفع مستند جديد
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error || "فشل في تحميل المستندات"}
        </div>
      )}

      {/* Quick Upload Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {documentTypes.map((type) => {
          const colorKey =
            type.value === "image"
              ? "blue"
              : type.value === "invoice"
                ? "green"
                : type.value === "warranty"
                  ? "purple"
                  : type.value === "manual"
                    ? "orange"
                    : "gray";
          const colors = colorMap[colorKey] ?? {
            bg: "bg-gray-600",
            text: "text-gray-600",
            light: "bg-gray-100 dark:bg-gray-700",
          };
          return (
            <button
              key={type.value}
              onClick={() => {
                setUploadForm((prev) => ({
                  ...prev,
                  documentType: type.value,
                }));
                setShowUploadModal(true);
              }}
                className={`${colors.light} p-4 rounded-xl text-center hover:shadow-md transition-all border-2 border-transparent`}
              >
                <div className="flex justify-center mb-2">
                  {type.value === "image" && (
                    <PhotoIcon className="h-8 w-8 text-blue-600" />
                )}
                {type.value === "invoice" && (
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                )}
                {type.value === "warranty" && (
                  <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
                )}
                {type.value === "manual" && (
                  <BookOpenIcon className="h-8 w-8 text-orange-600" />
                )}
                {type.value === "other" && (
                  <DocumentIcon className="h-8 w-8 text-gray-600" />
                )}
              </div>
              <p className={`font-medium ${colors.text} text-sm`}>
                {type.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في المستندات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Asset Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">جميع الأصول</option>
              {assets
                .filter((asset) => asset && asset.id && asset.name)
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} {asset.code ? `(${asset.code})` : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`mr-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                    ? "bg-white/20"
                    : "bg-white dark:bg-gray-600"
                    }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <DocumentIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {searchQuery || activeTab !== "all" || selectedAsset !== "all"
              ? "لا توجد نتائج مطابقة"
              : "لا توجد مستندات"}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            ابدأ برفع مستندات لأصولك
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            رفع أول مستند
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {getDocumentIcon(doc.documentType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {doc.fileName}
                  </h4>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    {getDocumentTypeLabel(doc.documentType)}
                  </p>
                  {doc.asset && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <ComputerDesktopIcon className="h-3.5 w-3.5" />
                      {doc.asset.name}
                    </div>
                  )}
                </div>
              </div>

              {doc.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {doc.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-400">
                  {formatDate(doc.uploadedAt)}
                  {doc.fileSize && ` • ${formatFileSize(doc.fileSize)}`}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <a
                  href={
                    doc.mimeType?.startsWith("image/")
                      ? undefined
                      : buildFileUrl(doc.fileUrl)
                  }
                  target={doc.mimeType === "application/pdf" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (doc.mimeType?.startsWith("image/")) {
                      e.preventDefault();
                      setLightbox({ open: true, src: buildFileUrl(doc.fileUrl) });
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <EyeIcon className="h-4 w-4" />
                  {doc.mimeType?.startsWith("image/")
                    ? "عرض الصورة"
                    : doc.mimeType === "application/pdf"
                      ? "فتح PDF"
                      : "معاينة"}
                </a>
                <a
                  href={buildFileUrl(doc.fileUrl)}
                  download={doc.fileName}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && filteredDocuments.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => fetchAllDocuments({ page: page + 1, append: true })}
            disabled={loadingMore}
            className="px-4 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            {loadingMore ? "جاري التحميل..." : "تحميل المزيد"}
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  رفع مستند جديد
                </h4>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Asset Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اختر الأصل *
                  </label>
                  {assetsLoading ? (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      جاري تحميل الأصول...
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-sm">
                      لا توجد أصول متاحة. يرجى إضافة أصول أولاً من تبويب "إدارة
                      الأصول"
                    </div>
                  ) : (
                    <select
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      value={uploadForm.assetId}
                      onChange={(e) =>
                        setUploadForm({
                          ...uploadForm,
                          assetId: e.target.value,
                        })
                      }
                    >
                      <option value="">-- اختر الأصل --</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} {asset.code ? `(${asset.code})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    نوع المستند *
                  </label>
                  <select
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    value={uploadForm.documentType}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        documentType: e.target.value,
                      })
                    }
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اختر ملف
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-200"
                  />
                  {selectedFile && (
                    <p className="mt-1 text-sm text-green-600">
                      تم اختيار: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="text-center text-gray-400 text-sm">أو</div>

                {/* File URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    رابط الملف
                  </label>
                  <input
                    type="url"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    value={uploadForm.fileUrl}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, fileUrl: e.target.value })
                    }
                    placeholder="https://..."
                    dir="ltr"
                    disabled={!!selectedFile}
                  />
                </div>

                {/* File Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    اسم الملف
                  </label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    value={uploadForm.fileName}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, fileName: e.target.value })
                    }
                    placeholder="مثال: فاتورة_شراء_لابتوب.pdf"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    value={uploadForm.description}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="وصف اختياري للمستند"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || !uploadForm.assetId}
                    className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {uploading ? "جاري الرفع..." : "رفع المستند"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={lightbox.open} onOpenChange={(open) => { if (!open) setLightbox({ open: false, src: "" }); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 gap-0 bg-transparent shadow-none ring-0 border-0 sm:max-w-[95vw]" showCloseButton={false}>
          <div className="relative flex items-center justify-center w-full h-full min-h-[50vh]">
            <button
              onClick={() => setLightbox({ open: false, src: "" })}
              className="absolute top-2 right-2 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full p-1.5 transition-colors"
              aria-label="إغلاق"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <img
              src={lightbox.src}
              alt="معاينة المستند"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsSection;
