export default {
    darkMode: 'class',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sarabun: ['Sarabun', 'sans-serif'],
        },
        colors: {
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb', // Primary color (blue-600)
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          secondary: {
            600: '#16a34a', // Secondary color (green)
          },
          danger: {
            600: '#dc2626', // Danger color (red)
          },
          warning: {
            500: '#eab308', // Warning color (yellow)
          },
        },
      },
    },
    plugins: [],
  }