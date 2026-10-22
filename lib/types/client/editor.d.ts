/**
 * Composer editor abstraction for dsh-prompt-history.
 *
 * DSH ≤ 0.1.1: the composer input is a <textarea> inside
 * `[data-composer-card]` — selections/carets read off selectionStart/End.
 * DSH ≥ 0.1.2: the composer input is a Lexical contenteditable host
 * (`[data-composer-input]`); draft writes still flow through
 * `inputActions.setDraft`, and caret/selection read off the DOM Selection.
 * Everything editor-shaped goes through this module so both hosts behave the
 * same from the plugin's point of view.
 */
export declare const COMPOSER_CARD = "[data-composer-card]";
/** The composer editor host (textarea on old DSH, contenteditable on new), if any. */
export declare function editorHost(): HTMLTextAreaElement | HTMLElement | null;
/** Is the event target the composer editor (the host or a node inside it)? */
export declare function isEditorTarget(target: EventTarget | null): boolean;
/** Whether the composer editor currently holds focus. */
export declare function editorFocused(): boolean;
/** The editor host's current plain text (its own content, not the draft mirror). */
export declare function editorText(host: HTMLTextAreaElement | HTMLElement): string;
/** Focus the editor host without scrolling (textarea or contenteditable). */
export declare function focusEditor(host: HTMLTextAreaElement | HTMLElement): void;
/**
 * The editor's selection as draft-text offsets [start, end), or null when the
 * editor is not the active selection owner. Exact on a textarea; best-effort
 * on the contenteditable (maps the DOM Selection through its text content).
 */
export declare function editorSelectionOffsets(host: HTMLTextAreaElement | HTMLElement): {
    start: number;
    end: number;
} | null;
/** The editor's selected text ('' when there is no selection inside it). */
export declare function editorSelectedText(host: HTMLTextAreaElement | HTMLElement): string;
/**
 * Move the editor caret to a draft-text offset (used to park the caret after
 * an insertion). Exact on a textarea; best-effort collapse on the
 * contenteditable (falls back to leaving the caret wherever the editor put it).
 */
export declare function setEditorCaret(host: HTMLTextAreaElement | HTMLElement, offset: number): void;
//# sourceMappingURL=editor.d.ts.map