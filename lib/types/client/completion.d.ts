/**
 * Prompt-history completion (Codex/fish-style type-ahead).
 *
 * Pure matching: given the live draft and the prompt history (oldest → newest)
 * return the remaining suffix of the newest entry the draft is a prefix of.
 * Rendering lives in ghost.ts; acceptance is wired up by InputHistory so the
 * feature can be toggled from Settings.
 */
/**
 * Whether a draft can be completed at all.
 *
 * Only single-line plain prompts: a ghost suffix cannot be laid out across
 * lines, and `/` / `@` drafts belong to the built-in command/reference menus —
 * the plugin must not compete with them.
 * @param draft - the live composer draft.
 * @returns true when the draft may be completed.
 */
export declare function completionEligible(draft: string): boolean;
/**
 * The completion suffix for `draft`, or null when nothing matches.
 *
 * A case-sensitive pass runs first so the user's own casing preference wins;
 * a case-insensitive pass then handles e.g. `git st` → `Git status` (the ghost
 * always renders the history entry's original casing).
 * @param draft - the live composer draft.
 * @param history - prompt history, oldest → newest.
 * @returns the ghost suffix, or null.
 */
export declare function matchCompletion(draft: string, history: readonly string[]): string | null;
//# sourceMappingURL=completion.d.ts.map