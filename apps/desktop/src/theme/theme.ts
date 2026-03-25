export const theme = {
  colors: {
    primary: "#2185d0",
    primaryDark: "#1678c2",
    secondary: "#1b1c1d",
    background: "#f9fafb",
    surface: "#ffffff",
    border: "#d4d4d5",
    text: "#212529",
    textSecondary: "#6c757d",
    success: "#21ba45",
    warning: "#f2711c",
    error: "#db2828",
    info: "#2185d0",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  fontSizes: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "24px",
    xxl: "32px",
  },
  shadows: {
    sm: "0 1px 3px rgba(0,0,0,0.1)",
    md: "0 4px 6px rgba(0,0,0,0.1)",
    lg: "0 10px 15px rgba(0,0,0,0.1)",
  },
  sidebar: {
    width: "220px",
  },
} as const;

export type Theme = typeof theme;
