/**
 * Client half of the prompt-suggestion bridge.
 *
 * The browser cannot call a model, so the host service registered by this
 * package's node half (`promptSuggest/suggest`) is mounted here through the
 * Typert Gateway and called with the recent conversation. Every failure is
 * swallowed: a missing host, an unmounted descriptor or a dead connection must
 * never disturb the composer.
 *
 * @module dsh-prompt-history/client/suggest
 */
/** One prediction request (mirrors the host contract). */
export interface SuggestRequest {
    /** Recent conversation, oldest → newest, flattened to plain text. */
    readonly context: string;
    /** Provider route override; the host default is used when absent. */
    readonly provider?: string;
    /** Provider-owned model id override; the host default is used when absent. */
    readonly model?: string;
}
/** One prediction result (mirrors the host contract). */
export interface SuggestResult {
    /** Single-line predicted prompt, or '' when unavailable. */
    readonly text: string;
}
/** The mounted bridge: fetch one prediction, or '' when unavailable. */
export interface SuggestBridge {
    /**
     * Ask the host for a predicted next prompt.
     * @param context - recent conversation text.
     * @param signal - cancellation (a new keystroke or a submit aborts it).
     * @returns the predicted single-line prompt, or '' when unavailable.
     */
    fetch(context: string, signal?: AbortSignal): Promise<string>;
}
/**
 * Mount this package's host face on the client Remote service.
 *
 * Must run inside a context that injects `remote`; the namespace service it
 * installs is `remote.<namespace>` (see the gateway's `remoteServiceKey`), so
 * binding happens from a second injected context that waits for that service.
 * @param ctx - a context with `remote` injected.
 * @returns true when the contribution mounted.
 */
export declare function mountContribution(ctx: unknown): Promise<boolean>;
/**
 * Bind the mounted namespace service into a bridge.
 * @param ctx - a context with `remote.promptSuggest` injected.
 * @returns the bridge, or null when the namespace is not callable.
 */
export declare function createBridge(ctx: unknown): SuggestBridge | null;
/**
 * Publish the mounted bridge to the composer entry.
 * @param bridge - the mounted bridge, or null when unavailable.
 */
export declare function setActiveBridge(bridge: SuggestBridge | null): void;
/**
 * Subscribe to bridge availability.
 * @param fn - listener invoked whenever the bridge changes.
 * @returns the unsubscribe disposer.
 */
export declare function subscribeBridge(fn: () => void): () => void;
/** The mounted bridge, or null when the host face is unavailable. */
export declare function getActiveBridge(): SuggestBridge | null;
/**
 * Flatten the visible conversation into role-tagged text for the predictor.
 *
 * Reads the rendered rows (they carry both sides of the conversation, which the
 * node projection does not) and normalizes whitespace so the prompt stays
 * compact.
 * @returns the context tail, or '' when the conversation is not readable.
 */
export declare function buildContext(): string;
//# sourceMappingURL=suggest.d.ts.map