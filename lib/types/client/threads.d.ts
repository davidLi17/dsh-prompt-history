import { type ChatRow } from './nodes.ts';
/** How a thread's session was obtained. */
export type ThreadOrigin = 'fork' | 'blank';
/** One side thread. */
export interface SideThread {
    /** Local identity used by the panel (the session id is the durable one). */
    readonly id: string;
    readonly sessionId: string;
    readonly origin: ThreadOrigin;
    /** Editable label; the session's own title can override it later. */
    readonly title: string;
}
/** Per-thread live state the chips badge. */
export interface ThreadState {
    /** A turn is producing right now. */
    readonly running: boolean;
    /** Turns that finished while this thread was not the one on screen. */
    readonly unread: number;
    /**
     * Rows already present when the thread started: a fork inherits the whole main
     * transcript, and counting those as "touched by the thread" would make the
     * write guard report a clash nobody caused.
     */
    readonly baseline: number;
}
/** The panel's snapshot: the thread list plus each thread's live state. */
export interface ThreadSnapshot {
    readonly threads: readonly SideThread[];
    readonly states: ReadonlyMap<string, ThreadState>;
}
/** A minimal observable: React reads it through useSyncExternalStore. */
export interface ThreadObservable<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
}
/** Threads and their session references, shared by every panel of this page. */
declare class ThreadStore {
    private readonly threads;
    private readonly refs;
    private readonly rows;
    private readonly turn;
    private readonly listeners;
    private readonly states;
    private readonly watchers;
    private viewed;
    private sequence;
    private cache;
    /** The lazy `sessions` service, or undefined before the host connection. */
    private sessions;
    /** The lazy `uiConversation` service, or undefined before it is provided. */
    private conversation;
    /** Current threads (stable array identity between changes). */
    list(): readonly SideThread[];
    /** Stable snapshot of threads and their live state. */
    snapshot(): ThreadSnapshot;
    /** State of one thread (never undefined for a known id). */
    stateOf(threadId: string): ThreadState;
    /** Total unread completions, for the sidebar tab chip. */
    unreadTotal(): number;
    /** Whether any thread is producing right now. */
    anyRunning(): boolean;
    /**
     * Mark the thread the user is looking at: it stops being unread.
     * @param threadId - the on-screen thread, or null when the panel shows none.
     */
    setViewed(threadId: string | null): void;
    /** Subscribe to the thread list. */
    subscribe(listener: () => void): () => void;
    /** Notify the panel that the thread list changed. */
    private notify;
    /**
     * Start a thread: fork the source session (full context) or create a blank one.
     * @param origin - fork inherits the whole conversation; blank starts empty.
     * @param sourceSessionId - the conversation to fork from (required for 'fork').
     * @param label - the panel label the thread is numbered under.
     * @returns the created thread, or null when the services are unavailable.
     */
    start(origin: ThreadOrigin, sourceSessionId: string, label: string): Promise<SideThread | null>;
    /** Send one prompt to a thread. */
    send(thread: SideThread, text: string): Promise<boolean>;
    /** Cancel the thread's running turn. */
    cancel(thread: SideThread): Promise<void>;
    /** Close a thread and release its session reference. */
    close(threadId: string): void;
    /**
     * Follow a thread's turn so a completion can be badged even while the user is
     * looking at another thread (or the panel is collapsed).
     * @param threadId - local thread identity.
     * @param sessionId - the thread's session.
     */
    private watchTurn;
    /**
     * The thread's rendered rows, assembled by the shell's own conversation
     * pipeline (the same snapshot the official view draws).
     * @param sessionId - the thread's session.
     * @returns an observable of rows, stable per session.
     */
    rowsOf(sessionId: string): ThreadObservable<readonly ChatRow[]>;
    /**
     * Whether the thread is producing a turn.
     * @param sessionId - the thread's session.
     * @returns an observable boolean, stable per session.
     */
    runningOf(sessionId: string): ThreadObservable<boolean>;
}
/** The page-wide thread store. */
export declare const threads: ThreadStore;
export {};
//# sourceMappingURL=threads.d.ts.map