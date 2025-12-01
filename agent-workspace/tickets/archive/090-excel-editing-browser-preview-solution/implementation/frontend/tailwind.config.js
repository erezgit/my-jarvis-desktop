/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      colors: {
        excel: {
          green: '#107c41',
          blue: '#185abd',
          gray: '#f2f2f2'
        }
      }
    },
  },
  plugins: [],
}