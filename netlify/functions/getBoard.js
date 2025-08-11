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

// netlify/functions/getBoard.js
exports.handler = async function (event, context) {
  // helper (inline)
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
      console.warn("resolveGetStore: @netlify/blobs module present but no getStore function found. keys:", Object.keys(mod || {}));
      return { getStore: null };
    } catch (err) {
      console.warn("resolveGetStore: require('@netlify/blobs') failed:", err && err.message);
      return { getStore: null };
    }
  }

  // ephemeral fallback (module-scoped behavior simulated via closure)
  // Note: in Netlify functions, module scope may persist while instance is warm.
  if (!global.__RPLACE_FALLBACK__) {
    global.__RPLACE_FALLBACK__ = {
      board: null
    };
  }
  const fallback = global.__RPLACE_FALLBACK__;

  function makeDefaultBoard(width, height) {
    const rows = [];
    for (let y = 0; y < height; y++) rows.push(new Array(width).fill("#ffffff"));
    return { width, height, pixels: rows };
  }

  try {
    const width = parseInt(process.env.BOARD_WIDTH || "200", 10);
    const height = parseInt(process.env.BOARD_HEIGHT || "100", 10);

    const { getStore } = resolveGetStore();

    if (!getStore) {
      // fallback path: keep an ephemeral board in memory
      if (!fallback.board) fallback.board = makeDefaultBoard(width, height);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(fallback.board)
      };
    }

    // get a store and try multiple API shapes (store.get(...), store.getJSON(...))
    const store = getStore("rplace");
    let board = null;

    if (typeof store.get === "function") {
      // prefer get(key, { type: 'json' })
      try {
        board = await store.get("board", { type: "json" });
      } catch (e) {
        // some API shapes may throw; fall through
        console.warn("store.get('board') threw:", e && e.message);
        board = null;
      }
    }

    if (!board && typeof store.getJSON === "function") {
      try {
        board = await store.getJSON("board");
      } catch (e) {
        console.warn("store.getJSON('board') threw:", e && e.message);
      }
    }

    // If still missing, attempt store.get('board') without options (older shape)
    if (!board && typeof store.get === "function") {
      try {
        const raw = await store.get("board");
        if (raw) {
          if (typeof raw === "string") board = JSON.parse(raw);
          else board = raw;
        }
      } catch (e) {
        console.warn("store.get('board') (no options) threw:", e && e.message);
      }
    }

    if (!board) {
      board = makeDefaultBoard(width, height);
      // persist initial board
      if (typeof store.setJSON === "function") {
        await store.setJSON("board", board);
      } else if (typeof store.set === "function") {
        await store.set("board", JSON.stringify(board));
      } else {
        console.warn("No set method on store; falling back to ephemeral board.");
        fallback.board = board;
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(board)
        };
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(board)
    };
  } catch (err) {
    console.error("getBoard error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
      body: `Internal error: ${err && err.stack ? err.stack : err}`
    };
  }
};
