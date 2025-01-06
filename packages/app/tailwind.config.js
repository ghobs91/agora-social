/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "nearly-bg-color": "var(--nearly-bg-color)",
        "border-color": "var(--border-color)",
        highlight: "var(--highlight)",
        "nostr-blue": "var(--repost)",
        "nostr-green": "var(--success)",
        "nostr-orange": "var(--zap)",
        "nostr-red": "var(--heart)",
        "nostr-purple": "var(--highlight)",
        warning: "var(--warning)",
        error: "var(--error)",
        success: "var(--success)",
        "gray-superlight": "var(--gray-superlight)",
        "gray-light": "var(--gray-light)",
        "gray-medium": "var(--gray-medium)",
        gray: "var(--gray)",
        "gray-secondary": "var(--gray-secondary)",
        "gray-tertiary": "var(--gray-tertiary)",
        "gray-dark": "var(--gray-dark)",
        "gray-superdark": "var(--gray-superdark)",
        "gray-ultradark": "var(--gray-ultradark)",
      },
      textColor: {
        secondary: "var(--font-secondary-color)",
        "font-color": "var(--font-color)",
      },
      spacing: {
        px: "1px",
      },
      padding: {
        "footer-height": "calc(56px + env(safe-area-inset-bottom))",
      },
      backgroundColor: {
        header: "var(--header-bg-color)",
        background: "var(--bg-color)",
        secondary: "var(--bg-secondary)",
      },
      animation: {
        "infinite-scroll": "infinite-scroll 25s linear infinite",
      },
      keyframes: {
        "infinite-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};
