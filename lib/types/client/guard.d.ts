/**
 * Parallel-write guard for the side chat.
 *
 * The side chat shares the main conversation's workspace and, by the user's
 * choice, may write files. Two agents editing one tree can clobber each other,
 * so this module turns the transcripts into the one fact that matters — which
 * files each side has touched — and reports the intersection.
 *
 * It is a reminder, never a gate: nothing here blocks a prompt or a write.
 *
 * @module dsh-prompt-history/client/guard
 */
import type { ChatRow } from './nodes.ts';
/** Extract the files a set of rows mentions. */
export declare function extractPaths(rows: readonly ChatRow[]): ReadonlySet<string>;
/**
 * Files both sides touched.
 * @param left - one side's paths.
 * @param right - the other side's paths.
 * @returns the shared paths, sorted, capped by the caller when rendering.
 */
export declare function overlaps(left: ReadonlySet<string>, right: ReadonlySet<string>): string[];
//# sourceMappingURL=guard.d.ts.map