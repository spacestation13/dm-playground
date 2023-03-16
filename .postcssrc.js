module.exports = function ({ env }) {
  return {
    plugins: [
      require("postcss-filter-stream")(
        ["**", "!**/src/styles/bulma/bulma.scss"],
        require("postcss-prefixer")({ prefix: "b-" }),
      ),
      require("autoprefixer"),
      env === "production"
        ? require("cssnano")({
            preset: "default",
          })
        : null,
      require("postcss-flexbugs-fixes"),
      env === "never"
        ? require("@fullhuman/postcss-purgecss")({
            content: [`./src/**/*.html`, `./src/**/*.vue`],
            defaultExtractor(content) {
              const contentWithoutStyleBlocks = content.replace(
                /<style[^]+?<\/style>/gi,
                "",
              );
              return (
                contentWithoutStyleBlocks.match(
                  /[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g,
                ) || []
              );
            },
            safelist: [
              /-(leave|enter|appear)(|-(to|from|active))$/,
              /^(?!(|.*?:)cursor-move).+-move$/,
              /^router-link(|-exact)-active$/,
              /data-v-.*/,
            ],
          })
        : null,
    ].filter(Boolean),
  };
};
