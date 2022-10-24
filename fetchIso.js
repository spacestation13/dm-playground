const fetch = require("make-fetch-happen");

const SCRIPT_URL =
  "https://github.com/spacestation13/dm-playground-linux/releases/download/1666468001/controller.iso";

module.exports = function (config, loaderContext) {
  return fetch(SCRIPT_URL)
    .then(response => response.buffer())
    .then(content => ({ code: content, cacheable: true }));
};
