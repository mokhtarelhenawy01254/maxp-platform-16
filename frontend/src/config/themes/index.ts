export type VisualThemeOption = {
  id: string;
  name: string;
  gradient: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
};

export const BUSINESS_THEME_ID = "business-os-enterprise";

export const themes: VisualThemeOption[] = [
  {
    id: BUSINESS_THEME_ID,
    name: "Business OS",
    gradient:
      "linear-gradient(135deg, rgb(15 91 255) 0%, rgb(26 193 205) 100%)",
    colors: {
      primary: "15 91 255",
      secondary: "26 193 205",
      background: "244 248 252",
    },
  },
  {
    id: "default",
    name: "Classic Indigo",
    gradient:
      "linear-gradient(135deg, rgb(79 70 229) 0%, rgb(59 130 246) 100%)",
    colors: {
      primary: "79 70 229",
      secondary: "59 130 246",
      background: "255 255 255",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    gradient: "linear-gradient(135deg, rgb(8 18 35) 0%, rgb(37 99 235) 100%)",
    colors: {
      primary: "8 18 35",
      secondary: "37 99 235",
      background: "15 23 42",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    gradient: "linear-gradient(135deg, rgb(6 16 24) 0%, rgb(34 211 238) 100%)",
    colors: {
      primary: "6 16 24",
      secondary: "34 211 238",
      background: "240 253 250",
    },
  },
  {
    id: "amethyst",
    name: "Amethyst",
    gradient:
      "linear-gradient(135deg, rgb(18 11 31) 0%, rgb(167 139 250) 100%)",
    colors: {
      primary: "18 11 31",
      secondary: "167 139 250",
      background: "250 245 255",
    },
  },
  {
    id: "royal",
    name: "Royal",
    gradient: "linear-gradient(135deg, rgb(20 11 51) 0%, rgb(236 72 153) 100%)",
    colors: {
      primary: "20 11 51",
      secondary: "236 72 153",
      background: "253 242 248",
    },
  },
];

export default themes;
