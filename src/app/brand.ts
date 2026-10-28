import { amber, green, orange, red, teal } from "@mui/material/colors";

/** Shared by the MUI theme and the imperative canvas overlay so both stay in sync. */
export const BRAND = {
  primary: amber[400],
  // Amber fails contrast on white; this darker shade passes WCAG AA for text.
  primaryOnLight: "#a15c00",
  secondary: teal[300],
  success: green[400],
  warning: orange[400],
  error: red[400],
  skeleton: "rgba(77, 182, 172, 0.85)",
  joint: "#ffffff",
  darkBackground: "#0f1115",
  darkPaper: "#171a21",
} as const;
