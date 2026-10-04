import type { Config } from "tailwindcss";

const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: v("background"),
        foreground: v("foreground"),
        card: v("card"),
        muted: v("muted"),
        "muted-foreground": v("muted-foreground"),
        border: v("border"),
        primary: v("primary"),
        "primary-foreground": v("primary-foreground"),
        accent: v("accent"),
        "accent-foreground": v("accent-foreground"),
        success: v("success"),
        warning: v("warning"),
        danger: v("danger"),
      },
      fontFamily: { sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"] },
      borderRadius: { xl: "0.9rem" },
    },
  },
  plugins: [],
};
export default config;
