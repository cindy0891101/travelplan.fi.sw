/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#E7DDD3',        // Postcard Cream
        paper: '#D2C2B2',        // Aged Paper
        steel: '#8E9CA3',        // Faded Steel
        harbor: '#577C8E',       // Harbor Blue
        stamp: '#DC8670',        // Warm Coral
        ink: '#2B2C2B',          // Ink Charcoal
        sage: '#577C8E',
        earth: '#D2C2B2',
        'earth-dark': '#8E9CA3',
        terracotta: '#DC8670',
        slate: '#D2C2B2',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        bold: '700',
      },
    },
  },
  plugins: [],
}