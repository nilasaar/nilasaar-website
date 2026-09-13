module.exports = function (eleventyConfig) {
  // Static assets copied as-is into the built site
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  // The Decap CMS admin panel needs to end up at /admin on the live site
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });

  // Every product (honey or coffee) is one markdown file in src/products/
  // This collection powers the catalog loop on the homepage.
  eleventyConfig.addCollection("products", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/products/*.md");
  });

  eleventyConfig.addCollection("honeyProducts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/products/*.md")
      .filter((product) => product.data.category === "honey");
  });

  eleventyConfig.addCollection("coffeeProducts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/products/*.md")
      .filter((product) => product.data.category === "coffee");
  });

  // Powers the hero image — whichever product is checked "Featured on
  // homepage?" in the CMS shows up there automatically.
  eleventyConfig.addCollection("featuredProducts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/products/*.md")
      .filter((product) => product.data.featured);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
};
