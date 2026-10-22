/** One directory entry: the prompt text and a row index for scroll targeting. */
/** Full props: the directory texts, in conversation order (already collapsed). */
export interface ChatTocProps {
    /** Every user/steering prompt text, oldest → newest (parent dedups). */
    readonly texts: readonly string[];
    /**
     * Called when the directory opens: the parent widens the loaded history
     * window (loadOlder pages) so the directory can list earlier messages too.
     */
    readonly onWiden?: () => void;
}
/** The TOC grip + panel entry. */
export declare function ChatToc({ texts, onWiden }: ChatTocProps): JSX.Element;
//# sourceMappingURL=ChatToc.d.ts.map