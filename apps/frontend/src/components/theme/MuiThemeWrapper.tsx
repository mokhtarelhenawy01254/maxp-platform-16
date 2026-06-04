import React from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import { arEG, enUS } from "@mui/material/locale";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../hooks/useTheme";

export const MuiThemeWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const { derivedTheme } = useTheme();
  const direction =
    typeof i18n.dir === "function"
      ? i18n.dir()
      : document.documentElement.dir ||
        ((i18n.language || "ar").startsWith("ar") ? "rtl" : "ltr");
  const isRtl = direction === "rtl";

  const theme = React.useMemo(
    () =>
      createTheme(
        {
          direction: isRtl ? "rtl" : "ltr",
          palette: {
            mode: derivedTheme,
            primary: {
              main: "#0f766e",
              light: "#14b8a6",
              dark: "#115e59",
              contrastText: "#ffffff",
            },
            secondary: {
              main: "#f59e0b",
              light: "#fbbf24",
              dark: "#b45309",
              contrastText: "#111827",
            },
            background:
              derivedTheme === "dark"
                ? {
                    default: "#07111f",
                    paper: "#0f1b2d",
                  }
                : {
                    default: "#f6f8fb",
                    paper: "#ffffff",
                  },
          },
          shape: {
            borderRadius: 14,
          },
          typography: {
            fontFamily:
              '"Geist Variable", "IBM Plex Sans Arabic", "Cairo", Tahoma, sans-serif',
            h1: { fontWeight: 800 },
            h2: { fontWeight: 800 },
            h3: { fontWeight: 800 },
            h4: { fontWeight: 800 },
            h5: { fontWeight: 700 },
            h6: { fontWeight: 700 },
            button: {
              fontWeight: 700,
              textTransform: "none",
            },
          },
          components: {
            MuiButton: {
              defaultProps: {
                disableElevation: true,
              },
              styleOverrides: {
                root: {
                  borderRadius: 12,
                },
              },
            },
            MuiCard: {
              styleOverrides: {
                root: {
                  borderRadius: 18,
                  boxShadow:
                    derivedTheme === "dark"
                      ? "0 18px 45px rgba(0, 0, 0, 0.28)"
                      : "0 18px 45px rgba(15, 23, 42, 0.08)",
                },
              },
            },
            MuiDialog: {
              styleOverrides: {
                paper: {
                  borderRadius: 22,
                },
              },
            },
            MuiTableContainer: {
              styleOverrides: {
                root: {
                  borderRadius: 16,
                },
              },
            },
            MuiTextField: {
              defaultProps: {
                size: "small",
              },
            },
          },
        },
        isRtl ? arEG : enUS,
      ),
    [derivedTheme, isRtl],
  );

  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};

export default MuiThemeWrapper;
