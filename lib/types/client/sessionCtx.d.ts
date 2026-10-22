/**
 * Session-window widening for the full-history TOC. A client plugin's apply()
 * runs on the root context, where per-session actions are reached through the
 * runtime `sessions` service: `binding(sessionId).session.loadOlder()` pages
 * one history page into the session's loaded window (the same mechanism the
 * chat uses when the user scrolls to older content). Pulling pages until
 * `hasMore` is false loads the ENTIRE conversation, so the directory can list
 * every user message — not just the initially loaded window.
 *
 * The service is provided only after the host connection is up, so it is
 * resolved LAZILY on every call (never captured at apply time): mirror of
 * ui-conversation's own `requireSessions()`.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Keep the root context (called once from apply). */
export declare function bindRootContext(ctx: ClientContext): void;
/** The captured root context, or undefined before apply ran. */
export declare function rootContextOrNull(): ClientContext | undefined;
/** Pull one older history page for `sessionId`; true when a page was pulled. */
export declare function pullOlderPage(sessionId: SessionId): Promise<boolean>;
//# sourceMappingURL=sessionCtx.d.ts.map