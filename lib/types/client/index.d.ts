/**
 * Prompt-history plugin, browser half: the composer entry (bash-like history,
 * copy modes, right-click paste, selection quote — see InputHistory.tsx) plus
 * a settings section with user toggles, internationalized (zh/en follows the
 * DSH app locale).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services: the slot registry, the locale service. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries, the composer input-history
 * entry, and the settings section (locale-aware label). Declarations live in
 * other packages whose apply order is unconstrained — slots.inject waits on
 * each declaration and retires the contribution with this plugin's fiber.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map