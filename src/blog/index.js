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

export function renderRssFeed({ title, description, site, items }) {
  const channelLink = new URL(site).href;
  const feedItems = items.map((item) => {
    const link = new URL(item.link, channelLink).href;
    const date = new Date(item.date);
    if (Number.isNaN(date.valueOf())) throw new TypeError(`invalid RSS item date: ${item.date}`);
    return [
      "<item>",
      `<title>${escapeXml(item.title)}</title>`,
      `<link>${escapeXml(link)}</link>`,
      `<guid>${escapeXml(link)}</guid>`,
      `<pubDate>${date.toUTCString()}</pubDate>`,
      `<description>${escapeXml(item.description)}</description>`,
      "</item>",
    ].join("");
  }).join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(channelLink)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    feedItems,
    "</channel></rss>",
  ].join("");
}

export function latestBlogEntry(entries, prefix = "blog/") {
  return sortBlogEntries(entries, { prefix })[0];
}

export function sortBlogEntries(
  entries,
  { prefix = "blog/", includeDrafts = false } = {},
) {
  return [...entries]
    .filter((entry) =>
      entry.id.startsWith(prefix) && (includeDrafts || !entry.data.draft),
    )
    .sort((left, right) => {
      const dateOrder = dateValue(right.data.date) - dateValue(left.data.date);
      return dateOrder || left.id.localeCompare(right.id);
    });
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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
