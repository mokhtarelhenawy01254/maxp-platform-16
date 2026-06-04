import React from "react";
import { Grid as MuiGrid } from "@mui/material";

type LegacyBreakpointValue = number | "auto" | boolean;

type MuiGridProps = React.ComponentProps<typeof MuiGrid>;

type CompatGridProps = Omit<MuiGridProps, "size"> & {
  item?: boolean;
  xs?: LegacyBreakpointValue;
  sm?: LegacyBreakpointValue;
  md?: LegacyBreakpointValue;
  lg?: LegacyBreakpointValue;
  xl?: LegacyBreakpointValue;
  size?: MuiGridProps["size"];
};

const normalizeBreakpointValue = (value?: LegacyBreakpointValue) => {
  if (value === true) return "grow";
  if (value === false || value === undefined) return undefined;
  return value;
};

const CompatGrid = React.forwardRef<HTMLDivElement, CompatGridProps>(
  ({ item, xs, sm, md, lg, xl, size, ...props }, ref) => {
    const responsiveSize =
      size ??
      (xs !== undefined ||
      sm !== undefined ||
      md !== undefined ||
      lg !== undefined ||
      xl !== undefined
        ? {
            ...(xs !== undefined ? { xs: normalizeBreakpointValue(xs) } : {}),
            ...(sm !== undefined ? { sm: normalizeBreakpointValue(sm) } : {}),
            ...(md !== undefined ? { md: normalizeBreakpointValue(md) } : {}),
            ...(lg !== undefined ? { lg: normalizeBreakpointValue(lg) } : {}),
            ...(xl !== undefined ? { xl: normalizeBreakpointValue(xl) } : {}),
          }
        : undefined);

    return (
      <MuiGrid
        ref={ref}
        size={responsiveSize as MuiGridProps["size"]}
        {...props}
      />
    );
  },
);

CompatGrid.displayName = "CompatGrid";

export default CompatGrid;
