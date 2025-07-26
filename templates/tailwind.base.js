export const theme = {
	extend: {
		colors: {
			destructive: "#DC2626",
			success: "#22C55E",
		},
		fontFamily: {
			sans: ["Inter", "sans-serif"],
		},
		fontSize: {
			landing: "2.75rem",
			h1: "30px",
			h2: "20px",
			title: "17px",
			body: "15px",
			caption: "13px",
		},
		lineHeight: {
			h1: "44px",
			h2: "28px",
			title: "24px",
			body: "20px",
			caption: "16px",
		},
		keyframes: {
			"accordion-down": {
				from: { height: "0" },
				to: { height: "var(--radix-accordion-content-height)" },
			},
			"accordion-up": {
				from: { height: "var(--radix-accordion-content-height)" },
				to: { height: "0" },
			},
		},
		animation: {
			"accordion-down": "accordion-down 0.2s ease-out",
			"accordion-up": "accordion-up 0.2s ease-out",
		},
	},
};
