// Runs at build time. Reads every product markdown file (the same files
// Decap CMS edits) and writes a JSON manifest the serverless checkout
// functions use to validate prices server-side — the browser is never
// trusted to say how much anything costs.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const PRODUCTS_DIR = path.join(__dirname, "..", "src", "products");
const OUTPUT_FILE = path.join(__dirname, "..", "api", "_products.json");

const manifest = {};

for (const filename of fs.readdirSync(PRODUCTS_DIR)) {
  if (!filename.endsWith(".md")) continue;
  const slug = filename.replace(/\.md$/, "");
  const { data } = matter(fs.readFileSync(path.join(PRODUCTS_DIR, filename), "utf8"));
  manifest[slug] = {
    title: data.title,
    price: data.price,
    category: data.category,
  };
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${Object.keys(manifest).length} product(s) to ${path.relative(process.cwd(), OUTPUT_FILE)}`);
