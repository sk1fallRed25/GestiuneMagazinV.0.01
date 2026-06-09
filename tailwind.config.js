/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ui: {
                    bg: 'var(--ui-bg)',
                    surface: 'var(--ui-surface)',
                    'surface-muted': 'var(--ui-surface-muted)',
                    border: 'var(--ui-border)',
                    text: 'var(--ui-text)',
                    'text-muted': 'var(--ui-text-muted)',
                    primary: 'var(--ui-primary)',
                    'primary-hover': 'var(--ui-primary-hover)',
                    danger: 'var(--ui-danger)',
                    'danger-hover': 'var(--ui-danger-hover)',
                    warning: 'var(--ui-warning)',
                    'warning-hover': 'var(--ui-warning-hover)',
                    success: 'var(--ui-success)',
                    'success-hover': 'var(--ui-success-hover)',
                    info: 'var(--ui-info)',
                    'info-hover': 'var(--ui-info-hover)',
                }
            },
            borderRadius: {
                'ui-sm': 'var(--ui-radius-sm)',
                'ui-md': 'var(--ui-radius-md)',
                'ui-lg': 'var(--ui-radius-lg)',
                'ui-xl': 'var(--ui-radius-xl)',
                'ui-2xl': 'var(--ui-radius-2xl)',
                'ui-3xl': 'var(--ui-radius-3xl)',
            },
            spacing: {
                'ui-xs': 'var(--ui-spacing-xs)',
                'ui-sm': 'var(--ui-spacing-sm)',
                'ui-md': 'var(--ui-spacing-md)',
                'ui-lg': 'var(--ui-spacing-lg)',
                'ui-xl': 'var(--ui-spacing-xl)',
            }
        },
    },
    plugins: [],
}