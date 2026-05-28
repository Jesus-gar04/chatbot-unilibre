/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta institucional — Universidad Libre (#C41230 rojo carmesí)
        ul: {
          50:  '#FFF1F2',
          100: '#FFE0E3',
          200: '#FFC5CB',
          300: '#FF9AA5',
          400: '#FF6070',
          500: '#F83248',
          600: '#E41130',   // rojo institucional principal
          700: '#C41230',   // rojo oscuro (botones, acentos)
          800: '#A10F28',
          900: '#860D22',
          950: '#4A0410',
        },
      },
      animation: {
        'bounce-dot': 'bounce 1s infinite',
      },
    },
  },
  plugins: [],
}
