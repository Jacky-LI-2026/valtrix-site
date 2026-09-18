import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 左文科技品牌色 - 匹配 LOGO 中的亮红色
        primary: {
          DEFAULT: "var(--color-primary, #CC0000)",
          light: "var(--color-primary-light, #E53935)",
          dark: "var(--color-primary-dark, #990000)",
          50: "#FFF5F5",
          100: "#FFE8E8",
          200: "#FFD0D0",
          300: "#FFA8A8",
          400: "#FF6B6B",
          500: "#E53935",
          600: "#CC0000",
          700: "#A80000",
          800: "#800000",
          900: "#5C0000",
          950: "#330000",
        },
        // 金刚石银色点缀色 - 体现高端科技质感
        accent: {
          DEFAULT: "var(--color-accent, #C0C0C0)",
          light: "#E8E8E8",
          dark: "#909090",
        },
        // 深灰/黑色系 - 匹配 LOGO 文字颜色
        dark: {
          DEFAULT: "var(--color-dark, #111111)",
          50: "#F7F7F7",
          100: "#EDEDED",
          200: "#D9D9D9",
          300: "#A8A8A8",
          400: "#787878",
          500: "#525252",
          600: "#3D3D3D",
          700: "#2A2A2A",
          800: "#1A1A1A",
          900: "#0F0F0F",
          950: "#080808",
        },
        // 标准灰色系
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
      },
      fontFamily: {
        // 匹配 LOGO 粗壮硬朗的无衬线风格
        sans: ["Inter", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
        display: ["Inter", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
      },
      fontWeight: {
        // LOGO 风格偏粗体
        black: "900",
      },
      letterSpacing: {
        tightest: "-0.05em",
      },
      container: {
        center: true,
        padding: "1rem",
        screens: {
          "2xl": "1280px",
        },
      },
    },
  },
  plugins: [],
};

export default config;
