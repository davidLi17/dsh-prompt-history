/**
 * Client-side preferences for dsh-prompt-history, backed by localStorage.
 * A tiny observable store: listeners subscribe via {@link subscribePrefs},
 * snapshots stay reference-stable until {@link setPref} replaces the object,
 * so React's useSyncExternalStore and the event-time reads in InputHistory
 * both see the same authoritative value.
 */
/** Copy behavior on text selection. */
export type CopyMode = 'toolbar' | 'auto' | 'off';
/** The user-facing settings of this plugin. */
export interface PluginPrefs {
    /**
     * How a selection copies: 'toolbar' shows an explicit copy button above the
     * selection (the safe default — nothing writes the system clipboard until
     * the user clicks); 'auto' copies the selection directly (terminal-style,
     * floods clipboard history); 'off' leaves selections to the host and other plugins.
     */
    copyMode: CopyMode;
    /** Right-click on the composer textarea pastes the clipboard directly. */
    rightClickPaste: boolean;
    /** Keep one global prompt-history ring across sessions (localStorage). */
    globalHistory: boolean;
    /** Show the draggable Chat TOC grip on the chat's left edge. */
    tocVisible: boolean;
    /**
     * Codex-style prompt completion: while the draft is a prefix of an earlier
     * prompt, ghost the rest after the caret and accept it with Tab / →.
     */
    promptCompletion: boolean;
    /**
     * Remind when the side chat and the main conversation touch the same files in
     * parallel. Warning only: nothing is blocked.
     */
    writeGuard: boolean;
    /**
     * Experimental side chat: a second work thread in the right sidebar (docked
     * pane, split or floating) sharing this workspace. Off by default.
     */
    sideChat: boolean;
    /**
     * Codex-style next-prompt suggestion: when the composer is empty, ask the
     * host to predict the user's next prompt from the recent conversation and
     * ghost it. Costs a small model call per prediction.
     */
    contextSuggest: boolean;
}
/** Current prefs snapshot (stable until the next setPref). */
export declare function getPrefs(): PluginPrefs;
/** Apply one setting and persist it. */
export declare function setPref<K extends keyof PluginPrefs>(key: K, value: PluginPrefs[K]): void;
/** Subscribe to pref changes; returns the unsubscribe disposer. */
export declare function subscribePrefs(fn: () => void): () => void;
//# sourceMappingURL=prefs.d.ts.map