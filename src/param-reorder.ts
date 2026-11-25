export interface QueryParam {
  key: string;
  value: string;
}

export interface RowBox {
  top: number;
  bottom: number;
}

export interface AutoScrollInput {
  pointerY: number;
  containerTop: number;
  containerBottom: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  edge: number;
  maxStep: number;
}

/**
 * Drag-reorder is disabled while a search filter is active.
 * The table is then a subset of the list, so a drop has no single safe
 * index among the hidden rows. Clearing the filter re-enables the handles.
 * Filtering does not change array order, and Apply still writes that order.
 */
export function canReorderList(searchTerm: string): boolean {
  return searchTerm.trim().length === 0;
}

/**
 * Returns a new array ordered by `indexOrder`, or null when `indexOrder`
 * is not a permutation of the current indexes.
 */
export function reorderByIndexOrder<T>(
  items: readonly T[],
  indexOrder: readonly number[]
): T[] | null {
  if (indexOrder.length !== items.length) return null;

  const seen = new Set<number>();
  const next: T[] = [];

  for (const index of indexOrder) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= items.length ||
      seen.has(index)
    ) {
      return null;
    }
    seen.add(index);
    next.push(items[index]);
  }

  return next;
}

/**
 * Next visual index of the dragged row. The row stays put until the pointer
 * crosses the midpoint of a neighbor, which keeps the move from oscillating.
 */
export function nextDragIndex(
  boxes: readonly RowBox[],
  fromIndex: number,
  pointerY: number
): number {
  if (fromIndex < 0 || fromIndex >= boxes.length) return fromIndex;

  const dragged = boxes[fromIndex];
  let next = fromIndex;

  if (pointerY < dragged.top) {
    for (let i = fromIndex - 1; i >= 0; i--) {
      const mid = (boxes[i].top + boxes[i].bottom) / 2;
      if (pointerY < mid) next = i;
      else break;
    }
  } else if (pointerY > dragged.bottom) {
    for (let i = fromIndex + 1; i < boxes.length; i++) {
      const mid = (boxes[i].top + boxes[i].bottom) / 2;
      if (pointerY > mid) next = i;
      else break;
    }
  }

  return next;
}

/**
 * Pixels to add to scrollTop while a drag is in the edge zone.
 * Zero when the list cannot scroll further in that direction.
 */
export function autoScrollStep(input: AutoScrollInput): number {
  const maxScroll = Math.max(0, input.scrollHeight - input.clientHeight);
  if (maxScroll <= 0 || input.edge <= 0 || input.maxStep <= 0) return 0;

  const topZone = input.containerTop + input.edge;
  const bottomZone = input.containerBottom - input.edge;

  if (input.pointerY < topZone && input.scrollTop > 0) {
    const intensity = Math.min(1, (topZone - input.pointerY) / input.edge);
    return -Math.max(1, Math.round(input.maxStep * intensity));
  }

  if (input.pointerY > bottomZone && input.scrollTop < maxScroll - 0.5) {
    const intensity = Math.min(
      1,
      (input.pointerY - bottomZone) / input.edge
    );
    return Math.max(1, Math.round(input.maxStep * intensity));
  }

  return 0;
}

/**
 * Query string in array order. Blank keys are skipped.
 * More than 100 rows (including blanks) uses encodeURIComponent, matching
 * the previous Apply path. Smaller lists use URLSearchParams.
 */
export function buildSearch(params: readonly QueryParam[]): string {
  const usable = params.filter((param) => param.key.trim());
  if (usable.length === 0) return "";

  if (params.length > 100) {
    const parts = usable.map(
      (param) =>
        `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`
    );
    return `?${parts.join("&")}`;
  }

  const searchParams = new URLSearchParams();
  for (const param of usable) {
    searchParams.append(param.key, param.value);
  }
  const paramString = searchParams.toString();
  return paramString ? `?${paramString}` : "";
}
