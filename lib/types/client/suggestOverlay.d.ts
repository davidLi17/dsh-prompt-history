/**
 * Install the overlay stylesheet. Called once from the plugin body so the
 * placeholder-hiding rule exists even before the first prediction.
 */
export declare function installSuggestStyle(): void;
/** Is a suggestion currently on screen? */
export declare function suggestionVisible(): boolean;
/** Remove the suggestion overlay (idempotent). */
export declare function hideSuggestion(): void;
/**
 * Show progress in the composer while a request is in flight.
 *
 * Waiting in silence is what makes a probabilistic feature feel broken: the
 * prediction can take a few seconds, and an empty composer shows nothing at all
 * until it lands. The pending line uses the same overlay (and the same
 * self-correcting geometry), so the real prediction simply replaces it.
 * @param host - the composer editor host to align against.
 * @param host2 - unused placeholder kept for symmetry with showSuggestion.
 * @returns whether the pending line is on screen.
 */
export declare function showPending(text: string, host: HTMLElement, options?: ShowSuggestionOptions): boolean;
/**
 * Draw the predicted prompt inside the empty composer.
 *
 * The hint sits on its own line when the composer is tall enough (the Codex
 * look) and inline after the prediction when it is not, so nothing is ever
 * clipped.
 * @param text - the predicted next prompt.
 * @param hint - the accept hint copy (already localized).
 * @param host - the composer editor host to align against.
 * @returns whether the overlay is on screen.
 */
export interface ShowSuggestionOptions {
    /** Hide the composer's own placeholder under the ghost (off for panel fields). */
    readonly hidePlaceholder?: boolean;
}
export declare function showSuggestion(text: string, hint: string, host: HTMLElement, options?: ShowSuggestionOptions): boolean;
//# sourceMappingURL=suggestOverlay.d.ts.map