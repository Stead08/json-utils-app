import { useState, useRef, useCallback, useEffect } from "react";
import type { JsonValue } from "../../../domain/types/json";
import type { DiffEntry } from "../../../domain/types/diff";

export interface JsonStructureViewerProps {
	readonly leftData: JsonValue;
	readonly rightData: JsonValue;
	readonly diffEntries: readonly DiffEntry[];
}

interface JsonNodeProps {
	readonly value: JsonValue;
	readonly path: readonly (string | number)[];
	readonly diffEntries: readonly DiffEntry[];
	readonly side: "left" | "right";
	readonly expandedState: Map<string, boolean>;
	readonly onToggleExpand: (path: readonly (string | number)[]) => void;
}

/**
 * Converts a path to a string key for the expanded state map
 */
const pathToKey = (path: readonly (string | number)[]): string => {
	return JSON.stringify(path);
};

/**
 * Finds the diff entry for a given path
 */
const findDiffEntry = (
	path: readonly (string | number)[],
	diffEntries: readonly DiffEntry[],
): DiffEntry | undefined => {
	return diffEntries.find(
		(entry) =>
			entry.path.length === path.length &&
			entry.path.every((p, i) => p === path[i]),
	);
};

/**
 * Gets the background color for a diff type
 */
const getDiffBackground = (
	diffType: DiffEntry["type"] | undefined,
	side: "left" | "right",
): string => {
	if (!diffType || diffType === "unchanged") return "transparent";

	if (diffType === "added") {
		return side === "right" ? "var(--diff-added-bg)" : "transparent";
	}
	if (diffType === "removed") {
		return side === "left" ? "var(--diff-removed-bg)" : "transparent";
	}
	if (diffType === "modified") {
		return "var(--diff-modified-bg)";
	}

	return "transparent";
};

/**
 * Recursive component to render a JSON node
 */
const JsonNode = ({
	value,
	path,
	diffEntries,
	side,
	expandedState,
	onToggleExpand,
}: JsonNodeProps) => {
	const pathKey = pathToKey(path);
	const isExpanded = expandedState.get(pathKey) ?? true;

	const diffEntry = findDiffEntry(path, diffEntries);
	const bgColor = getDiffBackground(diffEntry?.type, side);

	const styles = {
		node: {
			fontFamily: "var(--font-mono)",
			fontSize: "var(--font-sm)",
			lineHeight: "1.6",
		},
		line: {
			display: "flex",
			alignItems: "flex-start",
			gap: "var(--spacing-xs)",
			padding: "2px var(--spacing-xs)",
			backgroundColor: bgColor,
			borderRadius: "var(--radius-xs)",
		},
		key: {
			color: "var(--accent-purple)",
			fontWeight: 600,
		},
		colon: {
			color: "var(--fg-secondary)",
		},
		value: {
			color: "var(--fg-primary)",
		},
		string: {
			color: "var(--accent-green)",
		},
		number: {
			color: "var(--accent-orange)",
		},
		boolean: {
			color: "var(--accent-pink)",
		},
		null: {
			color: "var(--fg-tertiary)",
		},
		bracket: {
			color: "var(--fg-secondary)",
			fontWeight: 700,
		},
		expandButton: {
			background: "none",
			border: "none",
			color: "var(--accent-cyan)",
			cursor: "pointer",
			padding: "0 var(--spacing-xs)",
			fontSize: "var(--font-xs)",
			minWidth: "20px",
		},
		indent: (level: number) => ({
			marginLeft: `${level * 20}px`,
		}),
	};

	// Null or undefined
	if (value === null || value === undefined) {
		return (
			<div style={{ ...styles.node, ...styles.line }}>
				<span style={styles.null}>{value === null ? "null" : "undefined"}</span>
			</div>
		);
	}

	// Primitive types
	if (typeof value === "string") {
		return (
			<div style={{ ...styles.node, ...styles.line }}>
				<span style={styles.string}>"{value}"</span>
			</div>
		);
	}

	if (typeof value === "number") {
		return (
			<div style={{ ...styles.node, ...styles.line }}>
				<span style={styles.number}>{value}</span>
			</div>
		);
	}

	if (typeof value === "boolean") {
		return (
			<div style={{ ...styles.node, ...styles.line }}>
				<span style={styles.boolean}>{String(value)}</span>
			</div>
		);
	}

	// Array
	if (Array.isArray(value)) {
		return (
			<div style={styles.node}>
				<div style={styles.line}>
					<button
						style={styles.expandButton}
						onClick={() => onToggleExpand(path)}
					>
						{isExpanded ? "▼" : "▶"}
					</button>
					<span style={styles.bracket}>
						[{value.length > 0 && !isExpanded ? "..." : ""}
					</span>
					{!isExpanded && <span style={styles.bracket}>]</span>}
				</div>
				{isExpanded && (
					<>
						{value.map((item, index) => (
							<div key={index} style={styles.indent(1)}>
								<div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
									<span style={styles.key}>{index}</span>
									<span style={styles.colon}>:</span>
									<JsonNode
										value={item}
										path={[...path, index]}
										diffEntries={diffEntries}
										side={side}
										expandedState={expandedState}
										onToggleExpand={onToggleExpand}
									/>
								</div>
							</div>
						))}
						<div style={styles.line}>
							<span style={styles.bracket}>]</span>
						</div>
					</>
				)}
			</div>
		);
	}

	// Object
	if (typeof value === "object") {
		const entries = Object.entries(value);
		return (
			<div style={styles.node}>
				<div style={styles.line}>
					<button
						style={styles.expandButton}
						onClick={() => onToggleExpand(path)}
					>
						{isExpanded ? "▼" : "▶"}
					</button>
					<span style={styles.bracket}>
						{"{"}
						{entries.length > 0 && !isExpanded ? "..." : ""}
					</span>
					{!isExpanded && <span style={styles.bracket}>{"}"}</span>}
				</div>
				{isExpanded && (
					<>
						{entries.map(([key, val]) => (
							<div key={key} style={styles.indent(1)}>
								<div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
									<span style={styles.key}>"{key}"</span>
									<span style={styles.colon}>:</span>
									<JsonNode
										value={val}
										path={[...path, key]}
										diffEntries={diffEntries}
										side={side}
										expandedState={expandedState}
										onToggleExpand={onToggleExpand}
									/>
								</div>
							</div>
						))}
						<div style={styles.line}>
							<span style={styles.bracket}>{"}"}</span>
						</div>
					</>
				)}
			</div>
		);
	}

	return null;
};

/**
 * Component to display JSON structures side-by-side with diff highlighting
 */
export const JsonStructureViewer = ({
	leftData,
	rightData,
	diffEntries,
}: JsonStructureViewerProps) => {
	const leftPanelRef = useRef<HTMLDivElement>(null);
	const rightPanelRef = useRef<HTMLDivElement>(null);
	const isSyncingScrollRef = useRef(false);

	// Manage expanded state for all nodes
	const [expandedState, setExpandedState] = useState<Map<string, boolean>>(
		new Map(),
	);

	// Handle expand/collapse toggle
	const handleToggleExpand = useCallback(
		(path: readonly (string | number)[]) => {
			const key = pathToKey(path);
			setExpandedState((prev) => {
				const next = new Map(prev);
				const currentState = prev.get(key) ?? true;
				next.set(key, !currentState);
				return next;
			});
		},
		[],
	);

	// Synchronize scroll between left and right panels
	useEffect(() => {
		const leftPanel = leftPanelRef.current;
		const rightPanel = rightPanelRef.current;

		if (!leftPanel || !rightPanel) return;

		const handleLeftScroll = () => {
			if (isSyncingScrollRef.current) return;
			isSyncingScrollRef.current = true;
			rightPanel.scrollTop = leftPanel.scrollTop;
			rightPanel.scrollLeft = leftPanel.scrollLeft;
			requestAnimationFrame(() => {
				isSyncingScrollRef.current = false;
			});
		};

		const handleRightScroll = () => {
			if (isSyncingScrollRef.current) return;
			isSyncingScrollRef.current = true;
			leftPanel.scrollTop = rightPanel.scrollTop;
			leftPanel.scrollLeft = rightPanel.scrollLeft;
			requestAnimationFrame(() => {
				isSyncingScrollRef.current = false;
			});
		};

		leftPanel.addEventListener("scroll", handleLeftScroll);
		rightPanel.addEventListener("scroll", handleRightScroll);

		return () => {
			leftPanel.removeEventListener("scroll", handleLeftScroll);
			rightPanel.removeEventListener("scroll", handleRightScroll);
		};
	}, []);

	const styles = {
		container: {
			display: "grid",
			gridTemplateColumns: "1fr 1fr",
			gap: "var(--spacing-lg)",
			padding: "var(--spacing-md)",
			backgroundColor: "var(--bg-primary)",
		},
		panel: {
			backgroundColor: "var(--bg-secondary)",
			borderRadius: "var(--radius-md)",
			padding: "var(--spacing-md)",
			overflow: "auto",
			maxHeight: "600px",
		},
		header: {
			fontSize: "var(--font-sm)",
			fontWeight: 700,
			color: "var(--fg-secondary)",
			marginBottom: "var(--spacing-sm)",
			padding: "var(--spacing-xs)",
			borderBottom: "1px solid var(--border-color)",
		},
	};

	return (
		<div style={styles.container}>
			<div ref={leftPanelRef} style={styles.panel}>
				<div style={styles.header}>Left JSON</div>
				<JsonNode
					value={leftData}
					path={[]}
					diffEntries={diffEntries}
					side="left"
					expandedState={expandedState}
					onToggleExpand={handleToggleExpand}
				/>
			</div>
			<div ref={rightPanelRef} style={styles.panel}>
				<div style={styles.header}>Right JSON</div>
				<JsonNode
					value={rightData}
					path={[]}
					diffEntries={diffEntries}
					side="right"
					expandedState={expandedState}
					onToggleExpand={handleToggleExpand}
				/>
			</div>
		</div>
	);
};
