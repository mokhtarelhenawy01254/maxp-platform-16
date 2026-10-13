import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  Lightbulb,
  BadgeCheck,
  Sparkles,
  X,
  Pencil,
  Image as ImageIcon,
  CheckCircle2,
  Paperclip,
  Calendar,
  Clock,
  Layers,
  Link as LinkIcon,
  UploadCloud,
} from "lucide-react";
import { Attachment } from "../../types/tasks";

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface Release {
  id: string;
  version: string;
  name: string;
}

import {
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "../../constants/taskConstants";

// Default component options
const componentOptions = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "database", label: "Database" },
  { value: "api", label: "API" },
  { value: "ui", label: "UI/UX" },
  { value: "mobile", label: "Mobile" },
  { value: "devops", label: "DevOps" },
  { value: "testing", label: "Testing" },
  { value: "documentation", label: "Documentation" },
  { value: "general", label: "General" },
];

const getAccessToken = (): string | null => tokenManager.getAccessToken();

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const DevTaskForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    businessValue: "",
    acceptanceCriteria: "",
    type: "FEATURE",
    priority: "MEDIUM",
    status: "BACKLOG",
    component: "",
    assigneeId: "",
    projectId: "",
    releaseId: "",
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split("T")[0];
    })(),
    startDate: new Date().toISOString().split("T")[0], // Default to today
    estimatedHours: "1",
    tags: "",
    gitBranch: "",
    companyId: "",
    ticketId: "",
    campaignId: "",
    targetAudience: "",
    budgetAllocation: "",
    expectedROI: "",
    relatedLinks: [] as { title: string; url: string }[],
  });

  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<Attachment[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});
  const checklistInputRef = React.useRef<HTMLInputElement>(null);

  // New Features State
  const [settings, setSettings] = useState<any>(null);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  useEffect(() => {
    fetchInitialData();
    fetchSettings();

    // Set initial status from query params
    const status = searchParams.get("status");
    if (status) {
      setFormData((prev) => ({ ...prev, status }));
    }
  }, []);

  // Merge default components with settings-defined ones
  const derivedComponentOptions = React.useMemo(() => {
    const defaultValues = new Set(componentOptions.map((o) => o.value));
    const customOptions = settings?.componentMappings
      ? Object.keys(settings.componentMappings)
          .filter((k) => !defaultValues.has(k))
          .map((k) => ({ value: k, label: k }))
      : [];
    return [...componentOptions, ...customOptions];
  }, [settings]);

  // Auto-Assignment Logic
  useEffect(() => {
    if (settings && settings.componentMappings && formData.component) {
      // Case-insensitive lookup
      const componentKey = Object.keys(settings.componentMappings).find(
        (k) => k.toLowerCase() === formData.component.toLowerCase(),
      );

      const autoAssignee = componentKey
        ? settings.componentMappings[componentKey]
        : null;

      if (autoAssignee && !formData.assigneeId) {
        // Only auto-assign if empty
        // Verify member exists
        const memberExists = teamMembers.find((m) => m.id === autoAssignee);
        if (memberExists) {
          setFormData((prev) => ({ ...prev, assigneeId: autoAssignee }));
        }
      }
    }
  }, [formData.component, settings, teamMembers]);

  useEffect(() => {
    if (isEdit) {
      fetchTask();
    }
  }, [id]);

  useEffect(() => {
    let createdUrls: string[] = [];

    const loadImages = async () => {
      const token = getAccessToken();
      if (!token) return;

      const urls: Record<string, string> = {};

      for (const file of existingImages) {
        try {
          const imageUrl =
            file.fileUrl || `/uploads/dev-tasks/${file.fileName}`;
          const response = await fetch(imageUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            urls[file.id] = objectUrl;
            createdUrls.push(objectUrl);
          }
        } catch (error) {
          console.error("Error loading image:", error);
        }
      }

      setImageBlobUrls(urls);
    };

    if (existingImages.length > 0) {
      loadImages();
    }

    return () => {
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [existingImages]);

  const fetchInitialData = async () => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });

      const [projectsRes, teamRes, releasesRes] = await Promise.all([
        fetch(buildApiUrl("super-admin/dev/projects"), { headers }),
        fetch(buildApiUrl("super-admin/dev/team"), { headers }),
        fetch(buildApiUrl("super-admin/dev/releases"), { headers }),
      ]);

      const [projectsData, teamData, releasesData] = await Promise.all([
        projectsRes.json(),
        teamRes.json(),
        releasesRes.json(),
      ]);

      if (projectsData.success) setProjects(projectsData.data);
      if (teamData.success) setTeamMembers(teamData.data);
      if (releasesData.success) setReleases(releasesData.data);
    } catch (err) {
      console.error("Error fetching initial data:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/settings"), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  };

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });

      const data = await response.json();
      if (data.success) {
        const task = data.data;
        // Normalize component value to lowercase to match componentOptions
        const normalizedComponent = task.component
          ? task.component.toLowerCase()
          : "";
        setFormData({
          title: task.title || "",
          description: task.description || "",
          businessValue: task.businessValue || "",
          acceptanceCriteria: task.acceptanceCriteria || "",
          type: task.type || "FEATURE",
          priority: task.priority || "MEDIUM",
          status: task.status || "BACKLOG",
          component: normalizedComponent,
          assigneeId: task.assigneeId || "",
          projectId: task.projectId || "",
          releaseId: task.releaseId || "",
          dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
          startDate: task.startDate ? task.startDate.split("T")[0] : "",
          estimatedHours: task.estimatedHours?.toString() || "",
          tags: task.tags?.join(", ") || "",
          gitBranch: task.gitBranch || "",
          companyId: task.companyId || "",
          ticketId: task.ticketId || "",
          campaignId: task.campaignId || "",
          targetAudience: task.targetAudience || "",
          budgetAllocation: task.budgetAllocation?.toString() || "",
          expectedROI: task.expectedROI?.toString() || "",
        });

        // Set Watchers
        if (task.watchers && Array.isArray(task.watchers)) {
          // Check if watchers is array of objects { memberId } or just IDs.
          // Based on Prisma relation, it returns DevTaskWatcher objects which have memberId.
          // But API might return simplified list if I updated controller.
          // Let's assume standard include: { watchers: { memberId: '...' }[] }
          const watcherIds = task.watchers.map((w: any) => w.memberId || w);
          setWatchers(watcherIds);
        }

        // Set Related Links
        if (task.relatedLinks) {
          setFormData((prev) => ({
            ...prev,
            relatedLinks: Array.isArray(task.relatedLinks)
              ? task.relatedLinks
              : [],
          }));
        }

        // Set Existing Images (Attachments)
        if (task.attachments && Array.isArray(task.attachments)) {
          setExistingImages(task.attachments);
        }
      } else {
        setError(data.error || "فشل في جلب المهمة");
      }
    } catch (err) {
      setError("فشل في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    if (!formData.description.trim()) {
      setError("الوصف مطلوب");
      return;
    }
    if (!formData.assigneeId) {
      setError("المسؤول مطلوب");
      return;
    }
    if (!formData.dueDate) {
      setError("تاريخ الاستحقاق مطلوب");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const token = getAccessToken();

      const payload = {
        ...formData,
        estimatedHours: formData.estimatedHours
          ? parseFloat(formData.estimatedHours)
          : 0,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        assigneeId: formData.assigneeId || null,
        projectId: formData.projectId || null,
        releaseId: formData.releaseId || null,
        dueDate: formData.dueDate || null,
        startDate: formData.startDate || null,
        component: formData.component || null,
        gitBranch: formData.gitBranch || null,
        companyId: formData.companyId || null,
        ticketId: formData.ticketId || null,
        campaignId: formData.campaignId || null,
        targetAudience: formData.targetAudience || null,
        budgetAllocation: formData.budgetAllocation
          ? parseFloat(formData.budgetAllocation)
          : null,
        expectedROI: formData.expectedROI
          ? parseFloat(formData.expectedROI)
          : null,
        checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
        watchers: watchers,
        relatedLinks: formData.relatedLinks,
      };

      const url = isEdit
        ? buildApiUrl(`super-admin/dev/tasks/${id}`)
        : buildApiUrl("super-admin/dev/tasks");

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        const taskId = data.data.id;

        // Upload images if selected
        if (selectedImages.length > 0 && taskId) {
          const formData = new FormData();
          selectedImages.forEach((image) => {
            formData.append("files", image);
          });

          await fetch(
            buildApiUrl(`super-admin/dev/tasks/${taskId}/attachments`),
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            },
          );
        }

        // Delete marked images
        if (imagesToDelete.length > 0) {
          await Promise.all(
            imagesToDelete.map((attachmentId) =>
              fetch(
                buildApiUrl(
                  `super-admin/dev/tasks/attachments/${attachmentId}`,
                ),
                {
                  method: "DELETE",
                  headers: getAuthHeaders(),
                },
              ),
            ),
          );
        }

        navigate("/super-admin/dev-tasks");
      } else {
        setError(data.error || "فشل في حفظ المهمة");
      }
    } catch (err) {
      setError("فشل في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    // Validate each file
    for (const file of fileArray) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`حجم الملف ${file.name} يجب أن يكون أقل من 20 ميجابايت`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        setError(`الملف ${file.name} يجب أن يكون صورة`);
        continue;
      }
      validFiles.push(file);
    }

    // Check total count
    if (existingImages.length + selectedImages.length + validFiles.length > 10) {
      setError("الحد الأقصى 10 صور");
      return;
    }

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages((prev) => [...prev, ...validFiles]);
    setError(null);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (attachmentId: string) => {
    setImagesToDelete((prev) => [...prev, attachmentId]);
    setExistingImages((prev) => prev.filter((img) => img.id !== attachmentId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const renderMainForm = () => (
    <div className="space-y-5">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl flex items-center gap-2">
          <X className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-destructive text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Basic Info Card */}
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2 border-b border-border/60 pb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>تفاصيل المهمة الأساسية</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              العنوان <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="مثال: ترقية بوابة الدفع الإلكتروني..."
              className="w-full px-3.5 py-2 border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground text-sm font-medium transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              الوصف <span className="text-destructive">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="وصف تفصيلي للمهمة والمتطلبات التقنية..."
              rows={6}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground text-xs leading-relaxed resize-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span>المرفقات والصور</span>
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                ({existingImages.length + selectedImages.length} / 10)
              </span>
            </label>

            <div className="space-y-3">
              {/* Image Previews Grid */}
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                  {/* Existing images */}
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
                      {imageBlobUrls[img.id] ? (
                        <img
                          src={imageBlobUrls[img.id]}
                          alt={img.originalName || "Task image"}
                          className="w-full h-28 object-cover"
                        />
                      ) : (
                        <div className="w-full h-28 bg-muted flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(img.id)}
                        className="absolute top-1.5 left-1.5 p-1 bg-destructive/90 text-destructive-foreground rounded-md hover:bg-destructive transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 right-1.5 bg-background/80 backdrop-blur-sm text-foreground text-[10px] px-1.5 py-0.5 rounded border border-border/40 font-mono tabular-nums">
                        {(img.fileSize / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                  ))}

                  {/* New image previews */}
                  {imagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative group rounded-lg overflow-hidden border border-border">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1.5 left-1.5 p-1 bg-destructive/90 text-destructive-foreground rounded-md hover:bg-destructive transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 right-1.5 bg-background/80 backdrop-blur-sm text-foreground text-[10px] px-1.5 py-0.5 rounded border border-border/40 font-mono tabular-nums">
                        {selectedImages[index]
                          ? (selectedImages[index].size / 1024 / 1024).toFixed(1)
                          : "0"}{" "}
                        MB
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Drop Area */}
              {existingImages.length + selectedImages.length < 10 && (
                <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-border hover:border-primary/50 rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <UploadCloud className="h-6 w-6 text-muted-foreground mb-1.5" />
                    <p className="text-xs font-medium text-foreground">
                      رفع صور توضيحية أو لقطات شاشة
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      حتى 10 صور (بحد أقصى 20MB لكل صورة)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business & Acceptance Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>القيمة التجارية (Business Value)</span>
          </label>
          <textarea
            value={formData.businessValue}
            onChange={(e) => handleChange("businessValue", e.target.value)}
            placeholder="لماذا نقوم بهذا العمل؟ ما الأثر والعائد المتوقع على الأعمال والعملاء؟"
            rows={5}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground text-xs leading-relaxed resize-none transition-colors"
          />
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <label className="block text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              <span>معايير القبول (Acceptance Criteria)</span>
            </span>
          </label>
          <p className="text-[11px] text-muted-foreground mb-2">
            اكتب كل معيار في سطر منفصل؛ سيتم تنظيمها تلقائياً كقائمة تحقق
          </p>
          <textarea
            value={formData.acceptanceCriteria}
            onChange={(e) => handleChange("acceptanceCriteria", e.target.value)}
            placeholder="- يجب تنفيذ الطلب خلال 200ms&#10;- يجب إظهار إشعار تأكيد للعميل&#10;- حفظ السجل في قاعدة البيانات"
            rows={4}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground text-xs leading-relaxed resize-none transition-colors"
          />
        </div>
      </div>

      {/* Checklists */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4 text-primary" />
          <span>قوائم التحقق المبدئية (Checklists)</span>
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={checklistInputRef}
              type="text"
              placeholder="أضف بنداً جديداً للقائمة..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    setChecklistItems([...checklistItems, val]);
                    e.currentTarget.value = "";
                  }
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => {
                const val = checklistInputRef.current?.value.trim();
                if (val) {
                  setChecklistItems([...checklistItems, val]);
                  if (checklistInputRef.current) {
                    checklistInputRef.current.value = "";
                  }
                }
              }}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              إضافة
            </button>
          </div>

          {checklistItems.length > 0 && (
            <ul className="space-y-1.5">
              {checklistItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/50 rounded-lg group text-xs"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground truncate">{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setChecklistItems(
                        checklistItems.filter((_, i) => i !== idx),
                      )
                    }
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Related Links */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <LinkIcon className="h-4 w-4 text-primary" />
          <span>الروابط والمراجع (Related Links)</span>
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="عنوان الرابط (مثال: توثيق API)"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (newLinkTitle.trim() && newLinkUrl.trim()) {
                    setFormData((prev) => ({
                      ...prev,
                      relatedLinks: [
                        ...prev.relatedLinks,
                        { title: newLinkTitle.trim(), url: newLinkUrl.trim() },
                      ],
                    }));
                    setNewLinkTitle("");
                    setNewLinkUrl("");
                  }
                }}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                إضافة
              </button>
            </div>
          </div>

          {formData.relatedLinks.length > 0 && (
            <ul className="space-y-1.5">
              {formData.relatedLinks.map((link, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/50 rounded-lg group text-xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {link.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono truncate dir-ltr">
                      {link.url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        relatedLinks: prev.relatedLinks.filter(
                          (_, i) => i !== idx,
                        ),
                      }))
                    }
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const renderSidebarForm = () => (
    <div className="space-y-4">
      {/* Primary Status & Priority Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            الحالة
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {(settings?.taskStatuses || STATUS_OPTIONS).map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            الأولوية
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(settings?.taskPriorities || PRIORITY_OPTIONS).map(
              (option: any) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange("priority", option.value)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    formData.priority === option.value
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {option.label}
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            النوع
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-2">
          التعيين والمسؤولية
        </h4>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            المسؤول الأساسي <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.assigneeId}
            onChange={(e) => handleChange("assigneeId", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">اختر المسؤول...</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            المراقبون
          </label>
          <select
            multiple
            value={watchers}
            onChange={(e) =>
              setWatchers(
                Array.from(e.target.selectedOptions, (o) => o.value),
              )
            }
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground h-20 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Context & Component Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-2">
          المشروع والمكون
        </h4>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            المشروع
          </label>
          <select
            value={formData.projectId}
            onChange={(e) => handleChange("projectId", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">بدون ملف مشروع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            الإصدار (Release)
          </label>
          <select
            value={formData.releaseId}
            onChange={(e) => handleChange("releaseId", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">بدون إصدار</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (v{r.version})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            المكون (Component)
          </label>
          <select
            value={formData.component}
            onChange={(e) => handleChange("component", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">General</option>
            {derivedComponentOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates & Estimation Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-2">
          التوقيت والتقدير
        </h4>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            تاريخ البدء
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            تاريخ الاستحقاق <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            الساعات التقديرية
          </label>
          <input
            type="number"
            placeholder="0.0"
            step="0.5"
            value={formData.estimatedHours}
            onChange={(e) => handleChange("estimatedHours", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground tabular-nums focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Tags Card */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <label className="block text-xs font-medium text-foreground mb-1.5">
          الوسوم (مفصولة بفواصل)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => handleChange("tags", e.target.value)}
          placeholder="react, api, ui..."
          className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-muted/20 focus:bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                {isEdit ? <Pencil className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <span>{isEdit ? "تعديل المهمة" : "إنشاء مهمة جديدة"}</span>
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              {isEdit
                ? `تحديث بيانات المهمة #${id?.slice(0, 8)}`
                : "أضف مهمة جديدة إلى خطة التطوير والمشاريع"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content (8 cols) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {renderMainForm()}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent"></div>
                    <span>جاري الحفظ...</span>
                  </>
                ) : isEdit ? (
                  "حفظ التعديلات"
                ) : (
                  "إنشاء المهمة"
                )}
              </button>
            </div>
          </div>

          {/* Sidebar (4 cols) */}
          <div className="col-span-12 lg:col-span-4">{renderSidebarForm()}</div>
        </div>
      </form>
    </div>
  );
};

export default DevTaskForm;
