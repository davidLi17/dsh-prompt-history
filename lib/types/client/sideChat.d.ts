import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Tab type identity (the body slot and the title seat are keyed by it). */
export declare const SIDE_CHAT_ID = "dsh-prompt-history.side-chat";
/** Kind discriminator passed to `openTab`. */
export declare const SIDE_CHAT_KIND = "side-chat";
/**
 * Bind the side chat to the sidebar services and follow the settings toggle.
 * @param ctx - a context that injects `sidebarRightTabs`, `sidebarRight` and `slots`.
 */
export declare function bindSideChat(ctx: ClientContext): void;
/**
 * Open (or reveal) a side-chat tab.
 * @param thread - thread identity passed to the body as navigation params.
 */
export declare function openSideChat(thread?: string): boolean;
/**
 * Float the tab into its own panel (the shell owns the mechanics).
 * @param tabId - this tab's id from `useTabInfo`.
 */
export declare function floatSideChatTab(tabId: string): void;
/** Return a floating panel to the docked column. */
export declare function dockSideChatTab(paneId: string): void;
/**
 * Split the pane holding this tab and seed the new pane.
 * @param paneId - the containing pane from `useTabInfo`.
 */
export declare function splitSideChatTab(paneId: string): void;
/** Whether the sidebar bridge is ready (the settings button uses it). */
export declare function sideChatReady(): boolean;
//# sourceMappingURL=sideChat.d.ts.map