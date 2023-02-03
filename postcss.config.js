module.exports = api => {
  return {
    plugins: [
      api.file.endsWith("/src/styles/bulma/bulma.scss")
        ? require("postcss-prefixer")({ prefix: "b-" })
        : null,
      require("autoprefixer"),
      process.env.NODE_ENV === "production"
        ? require("cssnano")({
            preset: "default",
          })
        : null,
      require("postcss-flexbugs-fixes"),
      process.env.NODE_ENV === "production" &&
      api.file.endsWith("/src/styles/bulma/bulma.scss")
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
