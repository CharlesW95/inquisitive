/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#1A1A18',
        surface: '#242422',
        'surface-input': '#2C2C2A',
        'text-primary': '#F0EFE8',
        'text-secondary': '#888884',
        'text-muted': '#555552',
        accent: '#C8A84B',
        'accent-subtle': '#C8A84B26',
        border: '#333330',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        serif: ['PlayfairDisplay_700Bold'],
      },
    },
  },
  plugins: [],
};
