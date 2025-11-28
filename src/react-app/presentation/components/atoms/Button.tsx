import type { ReactNode, ButtonHTMLAttributes } from "react";

/**
 * Button variant types
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

/**
 * Button size types
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Button props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	children: ReactNode;
	fullWidth?: boolean;
}

/**
 * Button component
 */
export const Button = ({
	variant = "primary",
	size = "md",
	children,
	fullWidth = false,
	className = "",
	disabled = false,
	...props
}: ButtonProps) => {
	const styles = {
		padding:
			size === "sm"
				? "0.5rem 0.75rem"
				: size === "md"
					? "0.75rem 1rem"
					: "1rem 1.5rem",
		fontSize:
			size === "sm"
				? "var(--font-sm)"
				: size === "md"
					? "var(--font-md)"
					: "var(--font-lg)",
		borderRadius: "var(--radius-md)",
		fontWeight: 500,
		transition: "all 0.2s ease",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "0.5rem",
		width: fullWidth ? "100%" : "auto",
		cursor: disabled ? "not-allowed" : "pointer",
		opacity: disabled ? 0.4 : 1,
		filter: disabled ? "grayscale(50%)" : "none",
		...getVariantStyles(variant),
	} as const;

	return (
		<button style={styles} className={className} disabled={disabled} {...props}>
			{children}
		</button>
	);
};

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: ButtonVariant) => {
	switch (variant) {
		case "primary":
			return {
				backgroundColor: "var(--accent-cyan)",
				color: "var(--bg-primary)",
			};
		case "secondary":
			return {
				backgroundColor: "var(--bg-tertiary)",
				color: "var(--fg-primary)",
			};
		case "danger":
			return {
				backgroundColor: "var(--accent-red)",
				color: "var(--fg-primary)",
			};
		case "ghost":
			return {
				backgroundColor: "transparent",
				color: "var(--fg-primary)",
				border: "1px solid var(--bg-tertiary)",
			};
	}
};
