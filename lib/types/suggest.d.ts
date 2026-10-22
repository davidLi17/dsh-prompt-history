/**
 * Host half of the prompt-suggestion bridge.
 *
 * The browser cannot reach a model: the harness owns `ctx.llm` (provider
 * routes, credentials, quota). This service exposes one Remote method to the
 * plugin's client half through the Typert Gateway, so the composer can ask the
 * host for a predicted next prompt.
 *
 * @module dsh-prompt-history/suggest
 */
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
/** One prediction request from the composer. */
export interface SuggestRequest {
    /** Recent conversation, oldest → newest, already flattened to plain text. */
    readonly context: string;
    /** Provider route override; the host default is used when absent. */
    readonly provider?: string;
    /** Provider-owned model id override; the host default is used when absent. */
    readonly model?: string;
}
/** One prediction result. `text` is '' when no suggestion could be produced. */
export interface SuggestResult {
    /** Single-line predicted user prompt, or '' when unavailable. */
    readonly text: string;
}
/** Prompt-suggestion Remote service: turns recent conversation into a next prompt. */
export declare class PromptSuggestService extends TypertRemoteService {
    constructor(ctx: Context);
    /**
     * Predict the user's next prompt from the recent conversation.
     * @param request - conversation context plus optional model override.
     * @returns the predicted single-line prompt ('' when unavailable).
     */
    suggest(request: SuggestRequest): Promise<SuggestResult>;
}
//# sourceMappingURL=suggest.d.ts.map