const fetch = require("isomorphic-fetch");

const request = async (
  url,
  { method, body, headers } = {
    method: "GET",
    headers: {},
  }
) => {
  const resp = await fetch(url, {
    body: body ? JSON.stringify(body) : null,
    credentials: "include",
    method,
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
  });
  return resp.json();
};

module.exports = request;
