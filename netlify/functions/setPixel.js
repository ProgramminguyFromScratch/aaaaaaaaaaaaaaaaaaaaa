// netlify/functions/setPixel.js
const { getStore } = require("@netlify/blobs");

function validColor(s) {
  return typeof s === "string" && /^#[0-9A-Fa-f]{6}$/.test(s);
}

exports.handler = async function (event, context) {
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

    const store = getStore("rplace");
    let board = await store.get("board", { type: "json" });

    if (!board || !Array.isArray(board.pixels)) {
      return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: "Board missing or invalid" };
    }

    if (x < 0 || y < 0 || x >= board.width || y >= board.height) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: "Out of bounds" };
    }

    board.pixels[y][x] = color;

    // Persist update (simple overwrite)
    if (typeof store.setJSON === "function") {
      await store.setJSON("board", board);
    } else {
      await store.set("board", JSON.stringify(board));
    }

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "OK" };
  } catch (err) {
    console.error("setPixel error:", err);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: "Internal error" };
  }
};
