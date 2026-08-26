const DEFAULT_WORDS_PER_MINUTE = 200;

export function readingMinutes(body, wordsPerMinute = DEFAULT_WORDS_PER_MINUTE) {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    throw new TypeError("wordsPerMinute must be greater than zero");
  }
  const words = String(body).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export function formatPostDate(date, locale = "en") {
  const parsed = parseDate(date);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function normalizePost(post) {
  if (!post || typeof post !== "object") {
    throw new TypeError("post must be an object");
  }
  for (const field of ["title", "date", "summary", "author"]) {
    if (typeof post[field] !== "string" || post[field].trim() === "") {
      throw new TypeError(`post.${field} must be a non-empty string`);
    }
  }
  parseIsoDate(post.date);
  const slug = post.slug ?? slugFromFilename(post.filename);
  if (!slug) throw new TypeError("post.slug or post.filename is required");
  const body = typeof post.body === "string" ? post.body : "";
  return Object.freeze({
    ...post,
    slug,
    body,
    readingMinutes: post.readingMinutes ?? readingMinutes(body),
  });
}

export function sortPosts(posts) {
  return [...posts]
    .map(normalizePost)
    .sort((left, right) =>
      left.date === right.date
        ? left.slug.localeCompare(right.slug)
        : right.date.localeCompare(left.date),
    );
}

export function latestPost(posts) {
  return sortPosts(posts)[0];
}

export function latestBlogEntry(entries, prefix = "blog/") {
  return [...entries]
    .filter((entry) => entry.id.startsWith(prefix) && !entry.data.draft)
    .sort(
      (left, right) =>
        dateValue(right.data.date) - dateValue(left.data.date),
    )[0];
}

function slugFromFilename(filename) {
  if (typeof filename !== "string") return undefined;
  return filename.replace(/\.mdx?$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new TypeError(`invalid post date: ${value}`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`invalid post date: ${value}`);
  }
  return date;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  return parseIsoDate(value);
}

function dateValue(value) {
  if (value === undefined) return 0;
  return value instanceof Date ? value.valueOf() : parseIsoDate(value).valueOf();
}
