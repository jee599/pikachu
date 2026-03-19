import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        court: "#4a7c59",
        courtDark: "#3d6b4a",
        net: "#8b6914",
      },
    },
  },
  plugins: [],
};

export default config;
