const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./src/**/*.{ts,tsx}", // Added for new components
  ],
  darkMode: "class", // Added for dark mode support
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Indigo-600
          light: '#6366F1', // Indigo-500
          dark: '#4338CA', // Indigo-700
        },
        secondary: {
          DEFAULT: '#6B7280', // Gray-500
          light: '#9CA3AF', // Gray-400
          dark: '#4B5563', // Gray-600
        },
        accent: {
          DEFAULT: '#06B6D4', // Cyan-500
          light: '#22D3EE', // Cyan-400
          dark: '#0891B2', // Cyan-600
        },
        background: {
          DEFAULT: '#F9FAFB', // Gray-50
          dark: '#1F2937', // Gray-800
        },
        surface: {
          DEFAULT: '#FFFFFF', // White
          dark: '#374151', // Gray-700
        },
        border: {
          DEFAULT: '#E5E7EB', // Gray-200
          dark: '#4B5563', // Gray-600
        },
        success: '#10B981', // Green-500
        error: '#EF4444', // Red-500
        warning: '#F59E0B', // Yellow-500
      },
      animation: {
        aurora: "aurora 60s linear infinite",
      },
      keyframes: {
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
      },
    },
  },
  plugins: [addVariablesForColors], // Added plugin
};

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}