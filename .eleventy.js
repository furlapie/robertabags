module.exports = (cfg) => {
  cfg.addPassthroughCopy("src/css");
  cfg.addPassthroughCopy("src/js");
  cfg.addPassthroughCopy("src/img");
  cfg.addPassthroughCopy("src/admin");
  return {
    dir: { input: "src", output: "_site" },
    templateFormats: ["liquid", "html", "md"],
    htmlTemplateEngine: "liquid",
  };
};