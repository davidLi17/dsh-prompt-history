/** A brief feedback pill (已复制 / 已引用 …) above the given rect. */
export declare function flashCopied(rect?: DOMRect | null, text?: string): void;
/** Hide the copy toolbar (idempotent). */
export declare function hideSelectionToolbar(): void;
/**
 * Show the floating selection toolbar above the selection rect: 复制 copies
 * the current document selection; 引用 hands the selection to the caller for
 * insertion into the composer as a quote; 侧聊 sends it to the side chat.
 * Mousedown is suppressed so the selection survives the click.
 * @param rect - the selection's bounding rect (toolbar sits above it).
 * @param onQuote - quote handler; renders the 引用 button only when provided.
 * @param onSideChat - side-chat handler; renders the 侧聊 button only when provided.
 */
export declare function showSelectionToolbar(rect: DOMRect, onQuote?: () => void, onSideChat?: () => void): void;
/** Hide the reverse-search prompt bar (idempotent). */
export declare function hideSearchOverlay(): void;
/**
 * Show the bash-style reverse-search prompt above the composer card:
 * `(reverse-i-search)`query': match-preview`. Display-only (pointer-events
 * none), so it never interferes with the input underneath.
 */
export declare function showSearchOverlay(query: string, match: string): void;
//# sourceMappingURL=feedback.d.ts.map