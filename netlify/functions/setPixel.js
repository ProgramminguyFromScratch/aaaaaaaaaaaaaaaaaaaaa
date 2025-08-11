// robust-blobs-helper (inline in each function file)
/* Try multiple ways of importing @netlify/blobs and resolve a getStore function.
   Returns { getStore: function|null }
*/
function resolveGetStore() {
  try {
    const mod = require("@netlify/blobs");
    // possible shapes:
    // 1) { getStore: fn }
    // 2) function getStore(...) { ... } (module itself)
    // 3) { default: { getStore: fn } } (ESM default)
    if (mod) {
      if (typeof mod.getStore === "function") return { getStore: mod.getStore };
      if (typeof mod === "function") return { getStore: mod };
      if (mod.default) {
        if (typeof mod.default.getStore === "function") return { getStore: mod.default.getStore };
        if (typeof mod.default === "function") return { getStore: mod.default };
      }
    }
    console.warn("resolveGetStore: @netlify/blobs module present but no getStore function found. module keys:", Object.keys(mod || {}));
    return { getStore: null };
  } catch (err) {
    console.warn("resolveGetStore: require('@netlify/blobs') failed:", err && err.message);
    return { getStore: null };
  }
}
// netlify/functions/setPixel.js
exports.handler = async function (event, context) {
  function resolveGetStore() {
    try {
      const mod = require("@netlify/blobs");
      if (mod) {
        if (typeof mod.getStore === "function") return { getStore: mod.getStore };
        if (typeof mod === "function") return { getStore: mod };
        if (mod.default) {
          if (typeof mod.default.getStore === "function") return { getStore: mod.default.getStore };
          if (typeof mod.default === "function") return { getStore: mod.default };
        }
      }
      console.warn("resolveGetStore: @netlify/blobs present but getStore not found");
      return { getStore: null };
    } catch (err) {
      console.warn("resolveGetStore: require('@netlify/blobs') failed:", err && err.message);
      return { getStore: null };
    }
  }

  if (!global.__RPLACE_FALLBACK__) global.__RPLACE_FALLBACK__ = { board: null };
  const fallback = global.__RPLACE_FALLBACK__;

  function makeDefaultBoard(width, height) {
    const rows = [];
    for (let y = 0; y < height; y++) rows.push(new Array(width).fill("#ffffff"));
    return { width, height, pixels: rows };
  }

  function validColor(s) {
    return typeof s === "string" && /^#[0-9A-Fa-f]{6}$/.test(s);
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Access-Control-Allow-Origin": "*" }, body: "Method not allowed" };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const x = payload.x;
    const y = payload.y;
    const color = payload.color;

    if (!Number.isInteger(x) || !Number.isInteger(y) || !validColor(color)) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: "Bad payload" };
    }

    const width = parseInt(process.env.BOARD_WIDTH || "200", 10);
    const height = parseInt(process.env.BOARD_HEIGHT || "100", 10);

    const { getStore } = resolveGetStore();

    if (!getStore) {
      // ephemeral fallback
      if (!fallback.board) fallback.board = makeDefaultBoard(width, height);
      if (x < 0 || y < 0 || x >= fallback.board.width || y >= fallback.board.height) {
        return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: "Out of bounds" };
      }
      fallback.board.pixels[y][x] = color;
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "OK (ephemeral)" };
    }

    const store = getStore("rplace");
    // load board (try various shapes)
    let board = null;
    if (typeof store.get === "function") {
      try { board = await store.get("board", { type: "json" }); } catch (e) { board = null; }
    }
    if (!board && typeof store.getJSON === "function") {
      try { board = await store.getJSON("board"); } catch (e) { board = null; }
    }
    if (!board && typeof store.get === "function") {
      try {
        const raw = await store.get("board");
        if (raw) board = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) { board = null; }
    }

    if (!board) {
      board = makeDefaultBoard(width, height);
    }

    if (x < 0 || y < 0 || x >= board.width || y >= board.height) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: "Out of bounds" };
    }

    board.pixels[y][x] = color;

    // persist
    if (typeof store.setJSON === "function") {
      await store.setJSON("board", board);
    } else if (typeof store.set === "function") {
      await store.set("board", JSON.stringify(board));
    } else {
      // fallback to ephemeral if store can't persist
      fallback.board = board;
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "OK (ephemeral stored)" };
    }

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "OK" };
  } catch (err) {
    console.error("setPixel error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: `Internal error: ${err && err.stack ? err.stack : err}`
    };
  }
};
