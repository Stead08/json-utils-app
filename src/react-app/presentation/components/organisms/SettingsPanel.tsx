import type { CompareSettings } from "../../../domain/types/diff";

export interface SettingsPanelProps {
	readonly settings: CompareSettings;
	readonly onChange: (settings: CompareSettings) => void;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export const SettingsPanel = ({
	settings,
	onChange,
	isOpen,
	onToggle,
}: SettingsPanelProps) => {
	const styles = {
		container: {
			backgroundColor: "var(--bg-secondary)",
			borderRadius: "var(--radius-lg)",
			marginBottom: "var(--spacing-lg)",
			overflow: "hidden" as const,
		},
		headerButton: {
			width: "100%",
			backgroundColor: "transparent",
			border: "none",
			padding: "var(--spacing-lg)",
			cursor: "pointer",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			transition: "background-color 0.2s",
		} as const,
		headerContent: {
			display: "flex",
			alignItems: "center",
			gap: "var(--spacing-sm)",
			fontSize: "var(--font-md)",
			fontWeight: 700,
			color: "var(--fg-primary)",
		},
		toggleIcon: {
			fontSize: "var(--font-md)",
			color: "var(--fg-secondary)",
			transition: "transform 0.3s ease",
			transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
		},
		content: {
			maxHeight: isOpen ? "1000px" : "0",
			opacity: isOpen ? 1 : 0,
			transition: "max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease",
			padding: isOpen
				? "0 var(--spacing-lg) var(--spacing-lg)"
				: "0 var(--spacing-lg)",
			overflow: "hidden" as const,
		},
		header: {
			fontSize: "var(--font-md)",
			fontWeight: 700,
			color: "var(--fg-primary)",
			marginBottom: "var(--spacing-md)",
			display: "flex",
			alignItems: "center",
			gap: "var(--spacing-sm)",
		},
		grid: {
			display: "grid",
			gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
			gap: "var(--spacing-md)",
		},
		field: {
			display: "flex",
			flexDirection: "column" as const,
			gap: "var(--spacing-xs)",
		},
		label: {
			fontSize: "var(--font-sm)",
			color: "var(--fg-secondary)",
			display: "flex",
			alignItems: "center",
			gap: "var(--spacing-xs)",
		},
		checkboxContainer: {
			display: "flex",
			alignItems: "center",
			gap: "var(--spacing-sm)",
		},
		checkbox: {
			width: "18px",
			height: "18px",
			cursor: "pointer",
			accentColor: "var(--accent-cyan)",
		},
		input: {
			backgroundColor: "var(--bg-primary)",
			color: "var(--fg-primary)",
			border: "1px solid var(--border-color)",
			borderRadius: "var(--radius-md)",
			padding: "var(--spacing-sm)",
			fontSize: "var(--font-sm)",
			fontFamily: "inherit",
		},
		description: {
			fontSize: "var(--font-xs)",
			color: "var(--fg-tertiary)",
			marginTop: "var(--spacing-xs)",
		},
	};

	return (
		<div style={styles.container}>
			<button
				style={styles.headerButton}
				onClick={onToggle}
				aria-expanded={isOpen}
				aria-label="Toggle comparison settings"
			>
				<div style={styles.headerContent}>
					<span>⚙️</span>
					<span>Comparison Settings</span>
				</div>
				<span style={styles.toggleIcon}>▼</span>
			</button>

			<div style={styles.content}>
				<div style={styles.grid}>
					<div style={styles.field}>
						<div style={styles.checkboxContainer}>
							<input
								type="checkbox"
								id="ignoreArrayOrder"
								checked={settings.ignoreArrayOrder}
								onChange={(e) =>
									onChange({ ...settings, ignoreArrayOrder: e.target.checked })
								}
								style={styles.checkbox}
							/>
							<label htmlFor="ignoreArrayOrder" style={styles.label}>
								Ignore Array Order
							</label>
						</div>
						<div style={styles.description}>
							Arrays with same elements in different order will be considered
							equal
						</div>
					</div>

					<div style={styles.field}>
						<div style={styles.checkboxContainer}>
							<input
								type="checkbox"
								id="treatNullAsUndefined"
								checked={settings.treatNullAsUndefined}
								onChange={(e) =>
									onChange({
										...settings,
										treatNullAsUndefined: e.target.checked,
									})
								}
								style={styles.checkbox}
							/>
							<label htmlFor="treatNullAsUndefined" style={styles.label}>
								Treat Null as Undefined
							</label>
						</div>
						<div style={styles.description}>
							null and undefined values will be considered equal
						</div>
					</div>

					<div style={styles.field}>
						<label htmlFor="keyField" style={styles.label}>
							Array Key Field
						</label>
						<input
							type="text"
							id="keyField"
							placeholder="e.g., id"
							value={settings.keyField ?? ""}
							onChange={(e) =>
								onChange({
									...settings,
									keyField: e.target.value || undefined,
								})
							}
							style={styles.input}
						/>
						<div style={styles.description}>
							Field to use for matching array elements (e.g., "id")
						</div>
					</div>

					<div style={styles.field}>
						<label htmlFor="floatTolerance" style={styles.label}>
							Float Tolerance
						</label>
						<input
							type="number"
							id="floatTolerance"
							placeholder="e.g., 0.0001"
							step="0.0001"
							min="0"
							value={settings.floatTolerance ?? ""}
							onChange={(e) =>
								onChange({
									...settings,
									floatTolerance: e.target.value
										? parseFloat(e.target.value)
										: undefined,
								})
							}
							style={styles.input}
						/>
						<div style={styles.description}>
							Tolerance for floating point comparisons
						</div>
					</div>
				</div>

				<div style={{ ...styles.header, marginTop: "var(--spacing-lg)" }}>
					<span>✨</span>
					<span>Format Before Compare</span>
				</div>

				<div style={styles.grid}>
					<div style={styles.field}>
						<div style={styles.checkboxContainer}>
							<input
								type="checkbox"
								id="formatBeforeCompare"
								checked={settings.formatBeforeCompare}
								onChange={(e) =>
									onChange({
										...settings,
										formatBeforeCompare: e.target.checked,
									})
								}
								style={styles.checkbox}
							/>
							<label htmlFor="formatBeforeCompare" style={styles.label}>
								Format before comparing
							</label>
						</div>
						<div style={styles.description}>
							Automatically format JSON inputs before comparison
						</div>
					</div>

					{settings.formatBeforeCompare && (
						<>
							<div style={styles.field}>
								<label htmlFor="indent" style={styles.label}>
									Indent
								</label>
								<select
									id="indent"
									value={
										settings.formatSettings.indent === "\t"
											? "tab"
											: settings.formatSettings.indent
									}
									onChange={(e) => {
										const value = e.target.value;
										const indent =
											value === "tab" ? "\t" : (parseInt(value) as 2 | 4);
										onChange({
											...settings,
											formatSettings: {
												...settings.formatSettings,
												indent,
											},
										});
									}}
									style={styles.input}
								>
									<option value={2}>2 spaces</option>
									<option value={4}>4 spaces</option>
									<option value="tab">Tab</option>
								</select>
								<div style={styles.description}>
									Indentation size for formatted JSON
								</div>
							</div>

							<div style={styles.field}>
								<div style={styles.checkboxContainer}>
									<input
										type="checkbox"
										id="sortKeys"
										checked={settings.formatSettings.sortKeys}
										onChange={(e) =>
											onChange({
												...settings,
												formatSettings: {
													...settings.formatSettings,
													sortKeys: e.target.checked,
												},
											})
										}
										style={styles.checkbox}
									/>
									<label htmlFor="sortKeys" style={styles.label}>
										Sort object keys alphabetically
									</label>
								</div>
								<div style={styles.description}>
									Sort all object keys in alphabetical order
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
