// netlify/functions/hello.js
exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ ok: true, msg: "hello from Netlify Functions" })
  };
};
