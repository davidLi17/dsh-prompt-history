/**
 * Occlusion helper for the composer overlays.
 *
 * Both ghosts are `position: fixed` at `z-index: 2147482000` so they stay above
 * the composer's own content. The side effect is that any popup which happens
 * to cover the composer — the permission-preset menu, a context menu, a dialog
 * — is painted *under* the ghost, so the hint bleeds around the popup's edges
 * and across approval cards.
 *
 * This module answers a single question: what is covering this box, and how
 * high is it stacked? An overlay can then drop to just below that surface and
 * let the popup cover it cleanly, without moving the hint or hiding it.
 *
 * @module dsh-prompt-history/client/occlusion
 */
/** A box in viewport coordinates, as measured for the composer. */
export interface Box {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}
/**
 * The highest numeric z-index among elements covering `box`.
 *
 * Returns `null` when nothing covers the box, or when every cover is stacked
 * with `z-index: auto` — there is no surface to slide under in that case, so
 * callers keep their own default stacking.
 *
 * @param box - the overlay's target box, in viewport coordinates.
 * @param probe - the composer element the overlay belongs to; its descendants
 *   never count as covers.
 */
export declare function coveringZIndex(box: Box, probe: Element | null): number | null;
/**
 * Keep `el` behind whatever covers `box`.
 *
 * Two cases, because a cover is not always a popup:
 *
 * - the cover has a numeric z-index (menus, dialogs, poppers) — sit just below
 *   it, so the panel covers the hint exactly where they overlap and the hint
 *   keeps its place in the composer;
 * - the cover has no numeric z-index (an approval card rendered in normal flow
 *   above the composer) — there is no layer to slide under, so hide the hint
 *   softly: the node, its text and the tick stay alive, and the hint is back on
 *   the next paint after the cover goes away.
 *
 * The state is recomputed on every paint, which runs on a 250 ms tick and on
 * every viewport change, so both cases recover on their own.
 *
 * @param el - the overlay element to restack.
 * @param box - the box the overlay is drawn into, in viewport coordinates.
 * @param probe - the editor element the overlay belongs to; its content never
 *   counts as a cover.
 */
export declare function sitBelowCover(el: HTMLElement, box: Box, probe: Element | null): void;
//# sourceMappingURL=occlusion.d.ts.map