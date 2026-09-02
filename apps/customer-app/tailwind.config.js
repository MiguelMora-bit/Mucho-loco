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
          // Positive-delta green (stat trends, PRs) — was a bare arbitrary
          // hex repeated across dashboard/performance components.
          green:     '#6dd56d',
        },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        bebas:   ['Bebas Neue', 'Impact', 'sans-serif'],
        inter:   ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
        marker:  ['Permanent Marker', 'cursive'],
      },
      // Sizes the design repeats often that fall in the gaps of Tailwind's
      // default type scale (between xs/12px and between xl/2xl).
      fontSize: {
        10: '10px',
        11: '11px',
        22: '22px',
      },
      // Default scale already has 3.5 = 14px; these two fill the gaps this
      // design leans on (18px, 22px) so p-/m-/gap- stop reaching for [18px].
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
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
      dropShadow: {
        red: '0 0 8px rgba(225,20,28,0.7)',
      },
    },
  },
  plugins: [],
};
