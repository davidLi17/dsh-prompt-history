export declare const PLUGIN_VERSION: string;
/**
 * Tiny module-level translator for non-React code (feedback pills, the
 * selection toolbar, the search overlay, the TOC grip). apply() installs the
 * locale-bound translate function; T() reads the active locale at call time,
 * falling back to the key itself before apply runs or if a key is missing.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { PromptHistoryKey } from './locales.ts';
/** Install the locale-bound translate (called once from apply). */
export declare function setTranslator(fn: TranslateNS<'dsh-prompt-history'>): void;
/** Translate one plugin key using the active locale. */
export declare function T(key: PromptHistoryKey): string;
//# sourceMappingURL=i18n.d.ts.map