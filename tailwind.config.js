/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#39FF14',
          cyan: '#00FFFF',
          purple: '#B26EFF',
        },
        dark: {
          primary: '#1E1E1E',
          secondary: '#2A2A2A',
          tertiary: '#0B0B0B',
          card: '#141414',
        }
      },
      boxShadow: {
        'neon-green': '0 0 10px #39FF14',
        'neon-green-lg': '0 0 20px #39FF14',
        'neon-cyan': '0 0 10px #00FFFF',
        'neon-purple': '0 0 10px #B26EFF',
      },
      fontFamily: {
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 