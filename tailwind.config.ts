import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily: {
      sans: ["geist"],
      mono: ["geist-mono"],
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Additional colors from the screenshot theme
        syntax: {
          keyword: "#C586C0", // purple for SQL keywords
          function: "#569CD6", // light blue for SQL functions
          string: "#CE9178", // orange for string literals
          identifier: "#FFFFFF", // white for identifiers
          comment: "#6A9955", // green for comments
        },
        ui: {
          teal: "#00BCD4", // teal accent color
          "light-gray": "#A0A0A0", // light gray for secondary text
          "dark-gray": "#141414", // deep dark gray main background
          "card-gray": "#1F1F1F", // dark gray card background
        },
        // Additional colors from the table screenshot
        status: {
          success: "#28A745", // green for completed status
          processing: "#E97451", // orange for processing
          pending: "#FFC107", // yellow for pending
          failed: "#EF4444", // red for failed
        },
        authority: {
          dr: "#E97451", // orange for Domain Rating
          da: "#6B7280", // gray for Domain Authority
          as: "#4B5563", // darker gray for Authority Score
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  safelist: ["w-32", "w-44", "w-52"],
};
export default config;
