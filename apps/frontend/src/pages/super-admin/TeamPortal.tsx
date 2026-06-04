import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  alpha,
  useTheme as useMuiTheme,
  CircularProgress,
} from "@mui/material";
import {
  BugReport as BugIcon,
  Code as CodeIcon,
  HelpOutline as HelpIcon,
  Description as DocIcon,
  Sync as SyncIcon,
  AccountTree as StructureIcon,
} from "@mui/icons-material";
import { apiClient } from "../../services/apiClient";

const TeamPortal: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const [structureContent, setStructureContent] = useState<string>("");
  const [syncContent, setSyncContent] = useState<{
    dailyNotes: string;
    currentFocus: string;
    prevention: string;
  }>({
    dailyNotes: "جاري التحميل...",
    currentFocus: "جاري التحميل...",
    prevention: "جاري التحميل...",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mermaidRefs = useRef<HTMLDivElement[]>([]);

  const cardStyle = {
    p: 3,
    borderRadius: 4,
    height: "100%",
    bgcolor: isDark ? alpha("#1e293b", 0.6) : "#fff",
    backdropFilter: "blur(8px)",
    border: "1px solid",
    borderColor: isDark ? alpha("#eceef2", 0.1) : "#e2e8f0",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: isDark
        ? "0 20px 25px -5px rgba(0,0,0,0.5)"
        : "0 10px 15px -3px rgba(0,0,0,0.1)",
    },
  };

  const parseSyncContent = (content: string) => {
    const sections = {
      dailyNotes: "",
      currentFocus: "",
      prevention: "",
    };

    const dailyNotesMatch = content.match(
      /## 📝 ملاحظات اليوم \(Daily Notes\)\s*([\s\S]*?)(?=##|$)/,
    );
    const currentFocusMatch = content.match(
      /## 🚀 ما الذي نفعله الآن؟ \(Current Focus\)\s*([\s\S]*?)(?=##|$)/,
    );
    const preventionMatch = content.match(
      /## 🛠️ كيف نتفادى الأخطاء؟ \(Prevention Guide\)\s*([\s\S]*?)(?=##|$)/,
    );

    if (dailyNotesMatch) sections.dailyNotes = dailyNotesMatch[1].trim();
    if (currentFocusMatch) sections.currentFocus = currentFocusMatch[1].trim();
    if (preventionMatch) sections.prevention = preventionMatch[1].trim();

    return sections;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [structRes, syncRes] = await Promise.all([
          apiClient.get("/super-admin/docs/Structure.md"),
          apiClient.get("/super-admin/docs/TEAM_SYNC.md"),
        ]);

        if (structRes.data.success) {
          setStructureContent(structRes.data.content);
        }

        if (syncRes.data.success) {
          setSyncContent(parseSyncContent(syncRes.data.content));
        }
      } catch (err: any) {
        console.error("Error fetching documentation:", err);
        setError(err.response?.data?.message || "Failed to load documentation");

        // Fallback for demo if needed
        setSyncContent({
          dailyNotes:
            "• يرجى مراجعة ملف Bugs.md قبل رفع أي إصلاح جديد.\n• التوثيق أصبح إلزامياً الآن.",
          currentFocus:
            "• تطوير واجهة بوابة الفريق.\n• التحقق من المزامنة النهائية على السيرفر.",
          prevention:
            "1. اقرأ Structure.md\n2. سجل الحل في Bugs.md\n3. تواصل بوضوح.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (structureContent && typeof window !== "undefined") {
      const loadMermaid = () => {
        return new Promise<any>((resolve, reject) => {
          if ((window as any).mermaid) {
            resolve((window as any).mermaid);
            return;
          }
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
          script.onload = () => resolve((window as any).mermaid);
          script.onerror = reject;
          document.body.appendChild(script);
        });
      };

      loadMermaid()
        .then((mermaid) => {
          mermaid.initialize({
            startOnLoad: true,
            theme: isDark ? "dark" : "default",
            securityLevel: "loose",
          });

          const mermaidBlocks = extractMermaidBlocks(structureContent);
          mermaidBlocks.forEach((block, index) => {
            if (mermaidRefs.current[index]) {
              const containerId = `mermaid-${index}`;
              mermaid.render(containerId, block).then((result: any) => {
                if (mermaidRefs.current[index]) {
                  mermaidRefs.current[index].innerHTML = result.svg;
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error("Failed to load Mermaid:", err);
        });
    }
  }, [structureContent, isDark]);

  const extractMermaidBlocks = (content: string): string[] => {
    const regex = /```mermaid\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  };

  const mermaidBlocks = extractMermaidBlocks(structureContent);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, textAlign: "right" }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, mb: 1, color: isDark ? "#f1f5f9" : "#1e293b" }}
        >
          🤝 بوابة فريق العمل
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: isDark ? "#94a3b8" : "#64748b" }}
        >
          المنصة المركزية لتنسيق الجهود وتفادي الأخطاء التقنية بناءً على
          البيانات الحقيقية.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Sync Feed Section */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={cardStyle}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 3,
                gap: 2,
                flexDirection: "row-reverse",
              }}
            >
              <SyncIcon sx={{ color: "#3b82f6", fontSize: 32 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                تنسيق الفريق (TEAM_SYNC.md)
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ direction: "rtl" }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#3b82f6", fontWeight: 700, mb: 1 }}
                >
                  🔹 ملاحظات اليوم
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? "#cbd5e1" : "#475569",
                    lineHeight: 1.8,
                    whiteSpace: "pre-line",
                  }}
                >
                  {syncContent.dailyNotes}
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#10b981", fontWeight: 700, mb: 1 }}
                >
                  🚀 التركيز الحالي
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDark ? "#cbd5e1" : "#475569",
                    lineHeight: 1.8,
                    whiteSpace: "pre-line",
                  }}
                >
                  {syncContent.currentFocus}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              startIcon={<DocIcon />}
              sx={{ mt: 2, borderRadius: 2 }}
              onClick={() =>
                window.open("/api/v1/super-admin/docs/TEAM_SYNC.md", "_blank")
              }
            >
              تحميل ملف التنسيق الكامل
            </Button>
          </Paper>
        </Grid>

        {/* Quick Links Section */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Paper sx={{ ...cardStyle, p: 2 }}>
                <List>
                  <ListItem disablePadding>
                    <StyledListItemButton
                      sx={{ borderRadius: 2 }}
                      onClick={() =>
                        window.open(
                          "/api/v1/super-admin/docs/Bugs.md",
                          "_blank",
                        )
                      }
                    >
                      <ListItemIcon>
                        <BugIcon sx={{ color: "#ef4444" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="سجل الأخطاء (Bugs.md)"
                        secondary="آخر التحديثات والإصلاحات"
                        primaryTypographyProps={{ fontWeight: 700 }}
                        sx={{ textAlign: "right", mr: 2 }}
                      />
                    </StyledListItemButton>
                  </ListItem>
                  <ListItem disablePadding sx={{ mt: 1 }}>
                    <StyledListItemButton
                      sx={{ borderRadius: 2 }}
                      onClick={() =>
                        window.open(
                          "/api/v1/super-admin/docs/Structure.md",
                          "_blank",
                        )
                      }
                    >
                      <ListItemIcon>
                        <StructureIcon sx={{ color: "#a855f7" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="هيكلة المشروع (Structure.md)"
                        secondary="مسارات البيانات والوظائف"
                        primaryTypographyProps={{ fontWeight: 700 }}
                        sx={{ textAlign: "right", mr: 2 }}
                      />
                    </StyledListItemButton>
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            {/* Prevention Guide */}
            <Grid size={12}>
              <Paper
                sx={{
                  ...cardStyle,
                  bgcolor: alpha("#fbbf24", 0.05),
                  borderColor: alpha("#fbbf24", 0.2),
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: 2,
                    gap: 1,
                    flexDirection: "row-reverse",
                  }}
                >
                  <HelpIcon sx={{ color: "#fbbf24" }} />
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    كيف نتفادى الأخطاء؟
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: isDark ? "#cbd5e1" : "#475569",
                    textAlign: "right",
                    display: "block",
                    whiteSpace: "pre-line",
                  }}
                >
                  {syncContent.prevention}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Visual Map Section */}
        <Grid size={12}>
          <Paper sx={cardStyle}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, mb: 3, textAlign: "right" }}
            >
              🗺️ خريطة مسارات النظام (Structure.md)
            </Typography>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 200,
                }}
              >
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box
                sx={{
                  p: 4,
                  bgcolor: isDark
                    ? alpha("#ef4444", 0.1)
                    : alpha("#ef4444", 0.05),
                  borderRadius: 3,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" sx={{ color: "#ef4444" }}>
                  {error}
                </Typography>
              </Box>
            ) : mermaidBlocks.length > 0 ? (
              <Box sx={{ direction: "ltr" }}>
                {mermaidBlocks.map((_, index) => (
                  <Box
                    key={index}
                    ref={(el) => {
                      if (el) mermaidRefs.current[index] = el;
                    }}
                    sx={{
                      mb: 3,
                      p: 3,
                      bgcolor: isDark ? alpha("#000", 0.2) : "#f8fafc",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: isDark ? alpha("#fff", 0.1) : "#e2e8f0",
                      "& svg": {
                        maxWidth: "100%",
                        height: "auto",
                      },
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  p: 4,
                  bgcolor: isDark ? alpha("#000", 0.2) : "#f8fafc",
                  borderRadius: 3,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 200,
                  border: "2px dashed",
                  borderColor: isDark ? alpha("#fff", 0.1) : "#e2e8f0",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: isDark ? "#64748b" : "#94a3b8" }}
                >
                  [ لا توجد رسوم توضيحية متاحة حالياً في Structure.md ]
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Sub-component for buttons
const StyledListItemButton: React.FC<{
  children: React.ReactNode;
  sx?: any;
  onClick?: () => void;
}> = ({ children, sx, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      width: "100%",
      alignItems: "center",
      p: 1,
      cursor: "pointer",
      ...sx,
      "&:hover": { bgcolor: alpha("#3b82f6", 0.1) },
    }}
  >
    {children}
  </Box>
);

export default TeamPortal;
