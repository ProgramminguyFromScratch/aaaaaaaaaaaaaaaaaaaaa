// netlify/functions/getBoard.js
// returns JSON: { width, height, pixels:[ [ "#rrggbb", ... ], ... ] }

const { getStore } = require("@netlify/blobs");

function makeDefaultBoard(width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(new Array(width).fill("#ffffff"));
  }
  return { width, height, pixels: rows };
}

exports.handler = async function (event, context) {
  try {
    const width = parseInt(process.env.BOARD_WIDTH || "200", 10);
    const height = parseInt(process.env.BOARD_HEIGHT || "100", 10);

    // get a store (namespace) called "rplace"
    const store = getStore("rplace");

    // try to fetch board (returns JSON when asking type: 'json')
    let board = await store.get("board", { type: "json" });

    if (!board) {
      board = makeDefaultBoard(width, height);
      // persist initial board
      if (typeof store.setJSON === "function") {
        await store.setJSON("board", board);
      } else {
        // fallback if API differs
        await store.set("board", JSON.stringify(board));
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(board)
    };
  } catch (err) {
    console.error("getBoard error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Internal error"
    };
  }
};
