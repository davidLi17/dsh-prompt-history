/**
 * Prompt-history browsing, shared by the main composer and the side-chat
 * composer: bash-style prefix matching for ↑/↓, and substring matching for the
 * Ctrl+R reverse search. Pure functions so both composers keep the same feel.
 *
 * @module dsh-prompt-history/client/browse
 */
/** Indices of history entries that start with `prefix`, newest last. */
export declare function prefixMatches(history: readonly string[], prefix: string): number[];
/** Indices of history entries containing `query`, newest last. */
export declare function containsMatches(history: readonly string[], query: string): number[];
/** One browse session: where we are plus the line to restore on the way back. */
export interface BrowseState {
    /** Index into the history, or -1 when not browsing. */
    readonly index: number;
    /** The draft the user had before browsing started. */
    readonly saved: string;
    /** The line this plugin last wrote (so an edit ends browsing). */
    readonly lastSet: string;
    /** The prefix that started a prefix search, when there was one. */
    readonly prefix?: string;
}
/** Not browsing. */
export declare const RESET_BROWSE: BrowseState;
/**
 * Step one position through the matches of a prefix search.
 * @param history - prompt history, oldest → newest.
 * @param state - the current browse session (must carry a prefix).
 * @param delta - -1 for older, +1 for newer.
 * @returns the next state and line, or null when the walk leaves the matches.
 */
export declare function stepPrefix(history: readonly string[], state: BrowseState, delta: -1 | 1): {
    state: BrowseState;
    text: string;
} | null;
//# sourceMappingURL=browse.d.ts.map