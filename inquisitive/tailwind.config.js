/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#1A1A18",
        surface: "#242422",
        "surface-input": "#2C2C2A",
        "text-primary": "#F0EFE8",
        "text-secondary": "#888884",
        "text-muted": "#555552",
        accent: "#C8A84B",
        "accent-subtle": "#C8A84B26",
        border: "#333330",
      },
      fontFamily: {
        sans: ["Inter"],
        "sans-medium": ["Inter-Medium"],
        "sans-semibold": ["Inter-SemiBold"],
        serif: ["Fraunces"],
        "serif-bold": ["Fraunces-Bold"],
      },
    },
  },
  plugins: [],
};
