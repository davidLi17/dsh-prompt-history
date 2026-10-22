/** Is the ghost currently on screen? */
export declare function ghostVisible(): boolean;
/** Remove the ghost (idempotent). */
export declare function hideGhost(): void;
/**
 * Render `text` as a dim ghost right after the caret inside the composer.
 * @param text - the suffix to ghost.
 * @param host - the composer editor host holding the caret.
 * @returns whether the ghost is on screen.
 */
export declare function showGhost(text: string, host: HTMLTextAreaElement | HTMLElement): boolean;
//# sourceMappingURL=ghost.d.ts.map