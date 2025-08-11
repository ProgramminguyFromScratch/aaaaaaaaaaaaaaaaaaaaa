// netlify/functions/clear.js
const { getStore } = require("@netlify/blobs");

function makeDefaultBoard(width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(new Array(width).fill("#ffffff"));
  }
  return { width, height, pixels: rows };
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
    const width = parseInt(process.env.BOARD_WIDTH || "200", 10);
    const height = parseInt(process.env.BOARD_HEIGHT || "100", 10);
    const board = makeDefaultBoard(width, height);

    const store = getStore("rplace");
    if (typeof store.setJSON === "function") {
      await store.setJSON("board", board);
    } else {
      await store.set("board", JSON.stringify(board));
    }

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "OK" };
  } catch (err) {
    console.error("clear error:", err);
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: "Internal error" };
  }
};
