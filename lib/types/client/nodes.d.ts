/**
 * Tolerant conversation-node reading across DSH generations.
 *
 * ≤ 0.1.1 (web): session nodes are `{ kind, seq, content: ContentBlock[] }`.
 * 0.1.2 rc (web): the same old-shaped array is exposed as the chat snapshot's
 *   `legacy.nodes` (and `nodes` holds a ChatNodeStore). 2.0.x (desktop) nodes
 *   are `chatNode`-shaped `{ key, kind, ..., anchorSeq, data }` with the text
 *   content under `data.content`. Everything below normalizes one node to the
 *   three facts the plugin needs: kind, seq, plain text.
 */
export interface PromptMessage {
    readonly kind: string;
    /** Stable order identity for append-once dedup. */
    readonly seq: number;
    /** Trimmed plain text of the message, or null when empty/unsupported. */
    readonly text: string | null;
}
type NodeLike = {
    kind?: unknown;
    seq?: unknown;
    anchorSeq?: unknown;
    content?: unknown;
    data?: unknown;
};
/** The node's ordering identity: anchorSeq (new), then seq (old), then data.seq. */
export declare function nodeSeq(node: NodeLike): number;
/** Normalize one node into {kind, seq, text}; null for non-text/unsupported. */
export declare function promptMessage(node: unknown): PromptMessage | null;
/** One rendered conversation row: the role decides the bubble, text is its body. */
export interface ChatRow {
    readonly role: 'user' | 'assistant' | 'tool' | 'other';
    /** Stable identity for React keys (node seq, 0 when unknown). */
    readonly key: number;
    readonly text: string;
}
/** The ordered node array out of whichever chat snapshot shape is present. */
export declare function snapshotNodes(snapshot: unknown): readonly unknown[];
/**
 * Flatten assembled conversation nodes into the rows a compact log renders.
 *
 * Works for every generation because the text extraction above already handles
 * `content` and `data.content`; empty rows (pure containers) are skipped.
 * @param nodes - the ordered node array from a chat snapshot.
 * @returns the rows, oldest first.
 */
export declare function chatRows(nodes: readonly unknown[]): readonly ChatRow[];
export {};
//# sourceMappingURL=nodes.d.ts.map