/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta exacta del diseño Mucho Loco
        ml: {
          black:     '#0a0606',
          'black-2': '#140909',
          card:      '#1a0a0a',
          'card-2':  '#221010',
          border:    '#2a1414',
          red:       '#e1141c',
          'red-deep':'#a30b11',
          'red-bright': '#ff1a24',
          orange:    '#ff6b1a',
          yellow:    '#ffb627',
          cream:     '#f4ebe0',
          'cream-dim':'#b8a99c',
          muted:     '#6b5a52',
        },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        bebas:   ['Bebas Neue', 'Impact', 'sans-serif'],
        inter:   ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
        marker:  ['Permanent Marker', 'cursive'],
      },
      letterSpacing: {
        'wide-xl': '0.15em',
        'wide-2xl': '0.2em',
      },
      backdropBlur: {
        nav: '12px',
      },
      boxShadow: {
        red:    '0 0 16px rgba(225,20,28,0.7)',
        'red-lg':'0 8px 24px rgba(225,20,28,0.4)',
        'red-xl':'0 30px 80px rgba(225,20,28,0.3)',
        orange: '0 0 80px rgba(255,107,26,0.6)',
      },
    },
  },
  plugins: [],
};
