import type { SxProps, Theme } from "@mui/material/styles";

export const desktopTableSx: SxProps<Theme> = {
  display: { xs: "none", md: "block" },
};

export const mobileListSx: SxProps<Theme> = {
  display: { xs: "grid", md: "none" },
  gap: 2,
};
