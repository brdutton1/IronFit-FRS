/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Joint-state palette. Paired with text labels everywhere so color is
        // never the only signal (WCAG 2.1 AA, 1.4.1 Use of Color).
        joint: {
          moving: '#16a34a', // green-600  — moving correctly
          partial: '#ca8a04', // yellow-600 — partial / drifting
          wrong: '#dc2626', // red-600    — wrong direction / compensating
          still: '#2563eb', // blue-600   — held still correctly
          unknown: '#6b7280', // gray-500  — low confidence, skipped
        },
      },
    },
  },
  plugins: [],
};
