import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import { apiClient } from "../../services/apiClient";
import { BookOpenIcon } from "@heroicons/react/24/outline";

interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  order: number;
}

const AppExplanationsPage: React.FC = () => {
  const [explanations, setExplanations] = useState<AppExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExplanations = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/app-explanations/public");
        const data = res.data as any;
        if (data.success) {
          setExplanations(data.explanations);
        }
      } catch (err) {
        console.error("Failed to load explanations", err);
        setError("تعذر تحميل الشروحات. يرجى المحاولة لاحقاً.");
      } finally {
        setLoading(false);
      }
    };

    fetchExplanations();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 6, direction: "rtl" }}>
      <Box sx={{ mb: 6, textAlign: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <BookOpenIcon style={{ width: 48, height: 48, color: "#3b82f6" }} />
        </Box>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          شرح التطبيقات
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          دليلك الشامل لاستخدام تطبيقات وخدمات المنصة
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : explanations.length === 0 ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            لا توجد شروحات متاحة حالياً
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {explanations.map((exp) => (
            <Card 
              key={exp.id} 
              id={exp.slug}
              sx={{ 
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                overflow: "hidden"
              }}
            >
              <Box sx={{ bgcolor: "primary.main", color: "white", p: 2, px: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                  {exp.title}
                </Typography>
              </Box>
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    "& h1, & h2, & h3": { mb: 2, mt: 3, fontWeight: "bold" },
                    "& p": { mb: 2, lineHeight: 1.8 },
                    "& ul, & ol": { pl: 4, mb: 2 },
                    "& li": { mb: 1 },
                    "& img": { maxWidth: "100%", height: "auto", borderRadius: 2, my: 2 },
                  }}
                  dangerouslySetInnerHTML={{ __html: exp.content }}
                />
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default AppExplanationsPage;
