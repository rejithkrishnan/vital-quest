/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4285F4", // Google Blue
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#34A853", // Google Green
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EA4335", // Google Red
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#FBBC04", // Google Yellow
          foreground: "#000000",
        },
        background: "#FFFFFF",
        surface: "#F8F9FA",
        muted: "#F1F3F4",
        border: "#E0E0E0",
      },
    },
  },
  plugins: [],
};
