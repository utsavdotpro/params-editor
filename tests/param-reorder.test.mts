import assert from "node:assert/strict";
import test from "node:test";
import {
  autoScrollStep,
  buildSearch,
  canReorderList,
  nextDragIndex,
  reorderByIndexOrder,
} from "../src/param-reorder.ts";

const rows = (heights: number[], top = 0) => {
  const boxes = [];
  let cursor = top;
  for (const height of heights) {
    boxes.push({ top: cursor, bottom: cursor + height });
    cursor += height;
  }
  return boxes;
};

test("reorderByIndexOrder moves an item and does not mutate the source", () => {
  const items = ["alpha", "bravo", "charlie", "delta"];
  const next = reorderByIndexOrder(items, [2, 0, 1, 3]);
  assert.deepEqual(next, ["charlie", "alpha", "bravo", "delta"]);
  assert.deepEqual(items, ["alpha", "bravo", "charlie", "delta"]);
});

test("reorderByIndexOrder rejects a bad permutation", () => {
  const items = ["a", "b", "c"];
  assert.equal(reorderByIndexOrder(items, [0, 1]), null);
  assert.equal(reorderByIndexOrder(items, [0, 1, 1]), null);
  assert.equal(reorderByIndexOrder(items, [0, 1, 3]), null);
  assert.equal(reorderByIndexOrder(items, [0, 1, -1]), null);
});

test("canReorderList is only true when the search box is empty", () => {
  assert.equal(canReorderList(""), true);
  assert.equal(canReorderList("   "), true);
  assert.equal(canReorderList("alpha"), false);
});

test("nextDragIndex swaps only after the pointer crosses a neighbor midpoint", () => {
  const boxes = rows([40, 40, 40]);

  assert.equal(nextDragIndex(boxes, 0, 20), 0);
  assert.equal(nextDragIndex(boxes, 0, 59), 0);
  assert.equal(nextDragIndex(boxes, 0, 61), 1);
  assert.equal(nextDragIndex(boxes, 0, 101), 2);
  assert.equal(nextDragIndex(boxes, 2, 10), 0);
  assert.equal(nextDragIndex(boxes, 2, 30), 1);
  assert.equal(nextDragIndex(boxes, 2, 100), 2);
});

test("autoScrollStep scrolls toward content that is still offscreen", () => {
  const base = {
    containerTop: 100,
    containerBottom: 400,
    scrollHeight: 800,
    clientHeight: 300,
    edge: 36,
    maxStep: 16,
  };

  assert.equal(autoScrollStep({ ...base, pointerY: 250, scrollTop: 40 }), 0);
  assert.ok(autoScrollStep({ ...base, pointerY: 110, scrollTop: 40 }) < 0);
  assert.ok(autoScrollStep({ ...base, pointerY: 390, scrollTop: 40 }) > 0);
  assert.equal(autoScrollStep({ ...base, pointerY: 110, scrollTop: 0 }), 0);
  assert.equal(autoScrollStep({ ...base, pointerY: 390, scrollTop: 500 }), 0);
  assert.equal(
    autoScrollStep({
      ...base,
      pointerY: 390,
      scrollTop: 0,
      scrollHeight: 300,
      clientHeight: 300,
    }),
    0
  );
});

test("buildSearch keeps Apply order, including duplicates, and skips blank keys", () => {
  assert.equal(
    buildSearch([
      { key: "z", value: "1" },
      { key: "a", value: "hello world" },
      { key: " ", value: "ignored" },
      { key: "z", value: "2" },
    ]),
    "?z=1&a=hello+world&z=2"
  );
});

test("buildSearch uses the large-list encoder without sorting", () => {
  const params = Array.from({ length: 101 }, (_, index) => ({
    key: `k${String(index).padStart(3, "0")}`,
    value: index === 0 ? "a b" : String(index),
  }));
  params.push({ key: "", value: "nope" });
  const moved = reorderByIndexOrder(params, [
    100,
    ...params.map((_, index) => index).filter((index) => index !== 100),
  ]);
  assert.ok(moved);
  const search = buildSearch(moved);
  assert.ok(search.startsWith("?k100="));
  assert.ok(search.includes("k000=a%20b"));
  assert.equal(search.includes("nope"), false);
  assert.ok(search.indexOf("k000=") < search.indexOf("k001="));
});
