import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Avatar,
  InputAdornment,
  IconButton,
  Paper,
  Divider,
  Chip,
  Fade,
  Grid,
  useTheme,
  useMediaQuery,
  Stack,
} from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuthSimple";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("جميع الحقول مطلوبة");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(buildApiUrl("super-admin/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = "فشل في تسجيل الدخول";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage =
            response.statusText || `خطأ في الاتصال (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        // Prepare user data (ensure it has all required fields)
        // Super admin may not have a company
        const userData = {
          ...data.data.user,
          companyId: data.data.user.companyId || null,
          company: data.data.user.company || null,
        };

        // Store token first
        tokenManager.setAccessToken(data.data.token);

        // Store user data in localStorage for Socket.IO connection
        localStorage.setItem("user", JSON.stringify(userData));

        // Update auth context using login function
        const loggedInUser = await login(userData, data.data.token);

        // Redirect based on role
        if (loggedInUser) {
          const systemRoles = [
            "SUPER_ADMIN",
            "Project Manager",
            "Team Lead",
            "Developer",
            "Tester",
          ];
          const isSystemRole = systemRoles.includes(loggedInUser.role);

          if (isSystemRole) {
            navigate("/super-admin/dashboard");
          } else {
            console.log(
              "🔄 Regular user logged in via super-admin page, redirecting to company dashboard",
            );
            navigate("/company-dashboard");
          }
        } else {
          setError("فشل في تحديث حالة تسجيل الدخول");
        }
      } else {
        setError(data.message || "فشل في تسجيل الدخول");
      }
    } catch (err) {
      console.error("Super admin login error:", err);
      setError(err.message || "حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: {
          xs:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          md:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)"
              : "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)",
        },
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: {
            xs: "none",
            md: `radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)`,
          },
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: {
              xs: "none",
              md: "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 255, 255, 0.03) 60deg, transparent 120deg)",
            },
            animation: "rotate 20s linear infinite",
          },
        }}
      />

      {/* Main Content */}
      <Container
        maxWidth={false}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, md: 0 },
        }}
      >
        <Grid
          container
          spacing={{ xs: 0, lg: 8 }}
          alignItems="center"
          justifyContent="center"
        >
          {/* Left Side - Hidden on mobile */}
          {!isMobile && (
            <Grid item lg={6} sx={{ display: { xs: "none", lg: "block" } }}>
              <Fade in={mounted} timeout={1000}>
                <Box sx={{ color: "white", pr: 4 }}>
                  <Typography
                    variant="h2"
                    component="h1"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      fontSize: { lg: "3.5rem", xl: "4rem" },
                      lineHeight: 1.1,
                      mb: 3,
                    }}
                  >
                    لوحة تحكم
                    <Box
                      component="span"
                      sx={{ display: "block", color: "#a8b3ff" }}
                    >
                      مدير النظام
                    </Box>
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mb: 4,
                      opacity: 0.9,
                      fontSize: "1.25rem",
                      lineHeight: 1.6,
                    }}
                  >
                    إدارة شاملة ومتقدمة لجميع جوانب النظام
                  </Typography>

                  <Stack spacing={3}>
                    {[
                      {
                        icon: <DashboardIcon />,
                        text: "لوحة تحكم متقدمة وتحليلات شاملة",
                      },
                      {
                        icon: <ShieldIcon />,
                        text: "أمان عالي المستوى وحماية متقدمة",
                      },
                      { icon: <AdminIcon />, text: "صلاحيات إدارية كاملة" },
                    ].map((feature, index) => (
                      <Fade
                        in={mounted}
                        timeout={1500 + index * 300}
                        key={index}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: "rgba(255, 255, 255, 0.1)",
                              borderRadius: "12px",
                              backdropFilter: "blur(10px)",
                            }}
                          >
                            {feature.icon}
                          </Box>
                          <Typography
                            variant="body1"
                            sx={{ fontSize: "1.1rem" }}
                          >
                            {feature.text}
                          </Typography>
                        </Box>
                      </Fade>
                    ))}
                  </Stack>
                </Box>
              </Fade>
            </Grid>
          )}

          {/* Right Side - Login Form */}
          <Grid item xs={12} lg={6}>
            <Fade in={mounted} timeout={800}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "center", lg: "flex-start" },
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    width: "100%",
                    maxWidth: { xs: 400, sm: 450, md: 500 },
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(30, 41, 59, 0.8)"
                        : "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(20px)",
                    borderRadius: { xs: 3, md: 4 },
                    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)"}`,
                    overflow: "hidden",
                    position: "relative",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 8px 32px rgba(0, 0, 0, 0.3)"
                        : undefined,
                  }}
                >
                  {/* Header Section */}
                  <Box
                    sx={{
                      background:
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      px: { xs: 3, md: 4 },
                      py: { xs: 3, md: 4 },
                      textAlign: "center",
                      position: "relative",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 80, md: 100 },
                        height: { xs: 80, md: 100 },
                        bgcolor: "rgba(255, 255, 255, 0.2)",
                        mx: "auto",
                        mb: 2,
                        backdropFilter: "blur(10px)",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      <AdminIcon sx={{ fontSize: { xs: 40, md: 50 } }} />
                    </Avatar>

                    <Typography
                      variant={isMobile ? "h5" : "h4"}
                      component="h1"
                      gutterBottom
                      sx={{ fontWeight: 700 }}
                    >
                      مدير النظام
                    </Typography>

                    <Chip
                      label="SUPER ADMIN"
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        bgcolor: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        fontWeight: 600,
                        backdropFilter: "blur(10px)",
                      }}
                    />

                    <Typography variant="body2" sx={{ mt: 2, opacity: 0.9 }}>
                      تسجيل دخول آمن لوحة التحكم الرئيسية
                    </Typography>
                  </Box>

                  {/* Form Section */}
                  <CardContent
                    sx={{ px: { xs: 3, md: 4 }, py: { xs: 3, md: 4 } }}
                  >
                    {error && (
                      <Alert
                        severity="error"
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          "& .MuiAlert-icon": {
                            fontSize: "1.5rem",
                          },
                        }}
                      >
                        {error}
                      </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit}>
                      <TextField
                        fullWidth
                        label="البريد الإلكتروني"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        margin="normal"
                        required
                        sx={{
                          mb: 3,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(0, 0, 0, 0.02)",
                            color: theme.palette.text.primary,
                            "& fieldset": {
                              borderColor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.2)"
                                  : "rgba(0, 0, 0, 0.1)",
                            },
                            "&:hover": {
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.08)"
                                  : "rgba(0, 0, 0, 0.04)",
                              "& fieldset": {
                                borderColor:
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.3)"
                                    : undefined,
                              },
                            },
                            "&.Mui-focused": {
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "rgba(0, 0, 0, 0.02)",
                            },
                          },
                          "& .MuiInputLabel-root": {
                            color: theme.palette.text.secondary,
                          },
                          "& .MuiInputBase-input": {
                            color: theme.palette.text.primary,
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        fullWidth
                        label="كلمة المرور"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        margin="normal"
                        required
                        sx={{
                          mb: 4,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(0, 0, 0, 0.02)",
                            color: theme.palette.text.primary,
                            "& fieldset": {
                              borderColor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.2)"
                                  : "rgba(0, 0, 0, 0.1)",
                            },
                            "&:hover": {
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.08)"
                                  : "rgba(0, 0, 0, 0.04)",
                              "& fieldset": {
                                borderColor:
                                  theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.3)"
                                    : undefined,
                              },
                            },
                            "&.Mui-focused": {
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "rgba(0, 0, 0, 0.02)",
                            },
                          },
                          "& .MuiInputLabel-root": {
                            color: theme.palette.text.secondary,
                          },
                          "& .MuiInputBase-input": {
                            color: theme.palette.text.primary,
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockIcon color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                sx={{ color: "text.secondary" }}
                              >
                                {showPassword ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{
                          py: { xs: 1.5, md: 2 },
                          fontSize: { xs: "1rem", md: "1.1rem" },
                          fontWeight: 600,
                          borderRadius: 2,
                          background:
                            theme.palette.mode === "dark"
                              ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                          "&:hover": {
                            background:
                              theme.palette.mode === "dark"
                                ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                                : "linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)",
                            boxShadow: "0 6px 20px rgba(102, 126, 234, 0.6)",
                            transform: "translateY(-1px)",
                          },
                          "&:disabled": {
                            background:
                              "linear-gradient(135deg, #ccc 0%, #999 100%)",
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                      </Button>

                      <Divider
                        sx={{
                          my: 3,
                          borderColor:
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.1)"
                              : undefined,
                        }}
                      />

                      <Box textAlign="center">
                        <Button
                          variant="text"
                          onClick={() => navigate("/auth/login")}
                          size="small"
                          sx={{
                            color: "text.secondary",
                            "&:hover": {
                              bgcolor: "rgba(0, 0, 0, 0.04)",
                            },
                          }}
                        >
                          العودة لتسجيل الدخول العادي
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Paper>
              </Box>
            </Fade>
          </Grid>
        </Grid>
      </Container>

      {/* CSS Animations */}
      <style>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Box>
  );
};

export default SuperAdminLogin;
