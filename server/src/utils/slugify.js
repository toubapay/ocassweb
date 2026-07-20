function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (é -> e, etc.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends a short random suffix until `exists` (an async slug -> bool check) returns false. */
async function uniqueSlug(base, exists) {
  let slug = slugify(base) || "item";
  let attempt = 0;
  while (await exists(slug)) {
    attempt += 1;
    slug = `${slugify(base) || "item"}-${Math.random().toString(36).slice(2, 6)}`;
    if (attempt > 10) throw new Error("Could not generate a unique slug");
  }
  return slug;
}

module.exports = { slugify, uniqueSlug };
