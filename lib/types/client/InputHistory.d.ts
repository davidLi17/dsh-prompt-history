import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Full props of the input-history entry: framework standard kit + owner share. */
export type InputHistoryProps = PropsRuntime<'conversation.input.right'>;
/**
 * The composer history + right-click-paste entry.
 * @param props - framework standard kit (useInput/useSession/inputActions/sessionId).
 * @returns null (the entry is invisible chrome).
 */
export declare function InputHistory(props: InputHistoryProps): import("react").JSX.Element | null;
//# sourceMappingURL=InputHistory.d.ts.map