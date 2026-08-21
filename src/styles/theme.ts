export const theme = {
  colors: {
    primary: "#008156",
    accent: "#26d29a",
    error: "#ff9b9b",
    white: "#ffffff",
    gray70: "#b0b0b0",
    gray90: "#858585",
    gray300: "#575757",
    gray400: "#4a4a4a",
    gray500: "#3b3b3b",
    gray600: "#2e2e2e",
  },
  radius: {
    control: "10px",
    panel: "12px",
    pill: "999px",
  },
} as const;

export type AppTheme = typeof theme;
