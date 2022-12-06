/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontSize: {
      'xxs': '.6rem',
      'xs': '.75rem',
      'sm': '.875rem',
      'tiny': '.875rem',
      'base': '1rem',
      'lg': '1.125rem',
      'xl': '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '4rem',
      '7xl': '5rem',
    },
    screens: {
      'xs': '480px',
      // => @media (min-width: 480px) { ... }

      'sm': '640px',
      // => @media (min-width: 640px) { ... }

      'md': '768px',
      // => @media (min-width: 768px) { ... }

      'lg': '1024px',
      // => @media (min-width: 1024px) { ... }

      'xl': '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1800px',
      // => @media (min-width: 1536px) { ... }
    },
    extend: {
      colors: {
        "d-primary": "rgba(44, 51, 51, 1)",
        "d-secondary": "rgba(57, 91, 100, 1)",
        "d-accent-1": "rgba(165, 201, 202, 1)",
        "d-accent-2": "rgba(231, 246, 242, 1)",

        "primary": "rgba(244, 244, 242, 1)",
        "secondary": "rgba(232, 232, 232, 1)",
        "accent-1": "rgba(187, 191, 202, 1)",
        "accent-2": "rgba(73, 84, 100, 1)"
      },
      width: {
        "fullscreen": "100vw"
      },
      height: {
        "fullscreen": "100vh"
      },
    }
  },
  plugins: [],
}
