module.exports = (cfg) => {
  cfg.addPassthroughCopy({ "src/css": "css" });
  cfg.addCollection("countries", c =>
    c.getFilteredByGlob("src/country/*.md")
     .sort((a,b)=> a.data.title.localeCompare(b.data.title)));
  return { dir: { input: "src", includes: "_includes", output: "_site" } };
};
