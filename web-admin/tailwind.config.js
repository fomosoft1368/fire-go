/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#FF6B00',
        'primary-dark': '#e56200',
        'primary-light': '#ff8533',
        'background-light': '#f6f7f8',
        'background-dark': '#101922',
        'card-dark': '#1b242e',
        'surface-dark': '#1C252E',
        'surface-light': '#ffffff',
      },
      fontFamily: {
        'display': ['Plus Jakarta Sans', 'Inter', 'Noto Sans', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
