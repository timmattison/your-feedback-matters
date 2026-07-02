/**
 * Per-node predicate for `html-to-image`'s `toPng(node, { filter })`. Returning
 * `false` drops a node (and its subtree) from the captured snapshot.
 *
 * We exclude `<button>` elements — the form's Cancel / Toss actions — because
 * that one snapshot becomes both the crumpled-paper wad texture and, later, the
 * note a user fishes back out of the wastebasket to read. A fished-out note
 * should read as just the text the user wrote, not a live form still wearing its
 * action buttons, so the buttons are stripped at capture time and never appear
 * in either place.
 */
export function includeInSnapshot(node: HTMLElement): boolean {
  return node.tagName !== 'BUTTON';
}
