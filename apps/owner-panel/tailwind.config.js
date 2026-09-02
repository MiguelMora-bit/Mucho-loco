/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Misma paleta de marca que customer-app — sin los tokens
        // decorativos de landing page (fonts display, glow shadows).
        ml: {
          black:      '#0a0606',
          'black-2':  '#140909',
          card:       '#1a0a0a',
          'card-2':   '#221010',
          border:     '#2a1414',
          red:        '#e1141c',
          'red-deep': '#a30b11',
          'red-bright': '#ff1a24',
          orange:     '#ff6b1a',
          yellow:     '#ffb627',
          cream:      '#f4ebe0',
          'cream-dim':'#b8a99c',
          muted:      '#6b5a52',
          green:      '#6dd56d',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
