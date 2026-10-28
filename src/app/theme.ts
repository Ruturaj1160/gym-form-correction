import { createTheme, type PaletteMode } from "@mui/material/styles";
import type { CSSProperties } from "react";
import { BRAND } from "./brand";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    repCount: CSSProperties;
    timer: CSSProperties;
  }
  interface TypographyVariantsOptions {
    repCount?: CSSProperties;
    timer?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    repCount: true;
    timer: true;
  }
}

export function createAppTheme(mode: PaletteMode, reducedMotion: boolean) {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? BRAND.primary : BRAND.primaryOnLight },
      secondary: { main: BRAND.secondary },
      success: { main: BRAND.success },
      warning: { main: BRAND.warning },
      error: { main: BRAND.error },
      ...(mode === "dark"
        ? { background: { default: BRAND.darkBackground, paper: BRAND.darkPaper } }
        : {}),
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "Roboto, system-ui, sans-serif",
      button: { textTransform: "none", fontWeight: 600 },
      repCount: {
        fontSize: "clamp(3.5rem, 12vw, 6rem)",
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      },
      timer: {
        fontSize: "clamp(3rem, 14vw, 5.5rem)",
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      },
    },
    ...(reducedMotion
      ? { transitions: { create: () => "none" } }
      : {}),
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { minHeight: 44 } },
      },
      MuiIconButton: {
        styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiCard: {
        defaultProps: { variant: "outlined" },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16 } },
      },
      MuiTypography: {
        defaultProps: { variantMapping: { repCount: "div", timer: "div" } },
      },
    },
  });
}
