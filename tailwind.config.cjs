/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.tsx"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#017a6c",
                "primary-dark": "#015c51",
                "background-light": "#f9fafa",
                "background-dark": "#1c1c1c",
                "surface-light": "#ffffff",
                "surface-dark": "#262626",
                "border-light": "#e5e7eb",
                "border-dark": "#404040",
                "deep-work": "#4A5A70",
                "admin": "#7F9A8E",
                "light-task": "#D98E56",
                "personal": "#8E7BB0",
                "note-yellow": "#fff9c4",
                "note-yellow-dark": "#423e18",
                "note-pink": "#fce4ec",
                "note-pink-dark": "#4a1b26",
                "note-blue": "#e3f2fd",
                "note-blue-dark": "#153352",
                "note-green": "#e8f5e9",
                "note-green-dark": "#1b3e20",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "handwriting": ["Spline Sans", "sans-serif"],
                "brand": ['Comic Neue', 'cursive'],
            },
            boxShadow: {
                "soft": "0 2px 10px rgba(0, 0, 0, 0.03)",
                "card": "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)",
                'paper': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'paper-lifted': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            backgroundImage: {
                'dot-pattern': 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                'dot-pattern-dark': 'radial-gradient(#405363 1.5px, transparent 1.5px)',
                'grid-pattern': 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                'grid-pattern-dark': 'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
            },
            backgroundSize: {
                'dot-size': '24px 24px',
                'grid-size': '40px 40px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
    ],
}
