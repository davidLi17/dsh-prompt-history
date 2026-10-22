/** Props of the panel composer. */
export interface PromptComposerProps {
    /** Current draft (owned by the parent so quotes can be appended). */
    readonly value: string;
    readonly onChange: (value: string) => void;
    /** Enter: hand the draft to the thread. */
    readonly onSubmit: () => void;
    /** A turn is running: the parent shows Stop and the composer stops predicting. */
    readonly running: boolean;
    /** Prompt history for this thread, oldest → newest. */
    readonly history: readonly string[];
    /** Recent transcript for the model prediction. */
    readonly predictContext: () => string;
    readonly placeholder: string;
}
/** The side-chat composer entry. */
export declare function PromptComposer(props: PromptComposerProps): JSX.Element;
//# sourceMappingURL=panelComposer.d.ts.map