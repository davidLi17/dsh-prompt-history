/** Format selection text as a plain markdown blockquote (the plugin's quote style). */
export declare function quoteBlock(text: string): string;
type TextHandler = (text: string) => void;
/** The main composer's draft inserter: true when the text landed. */
type MainInserter = (text: string) => boolean;
/**
 * Register the main composer's "append to draft" behaviour.
 * @param insert - receives the text; returns whether it landed.
 * @returns disposer that clears the registration when the same handler is current.
 */
export declare function registerMainInserter(insert: MainInserter): () => void;
/**
 * Append text to the main composer draft.
 * @param text - already-formatted text (quote or plain).
 * @returns whether a main composer accepted it.
 */
export declare function insertIntoMain(text: string): boolean;
/**
 * Send text to the side-chat composer, opening the panel first.
 *
 * Text is delivered to a mounted panel immediately, or queued until one mounts
 * (the panel drains the queue when it subscribes).
 * @param text - already-formatted text (typically a quote block).
 */
export declare function sendToSideChat(text: string): void;
/**
 * Subscribe the panel composer to incoming text.
 * @param listener - receives text (queued text is flushed immediately).
 * @returns disposer removing the listener.
 */
export declare function subscribeSideChatInsert(listener: TextHandler): () => void;
export {};
//# sourceMappingURL=bridge.d.ts.map