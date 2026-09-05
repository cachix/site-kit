import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPostDate,
  latestBlogEntry,
  latestPost,
  normalizePost,
  readingMinutes,
  renderRssFeed,
  sortBlogEntries,
  sortPosts,
} from "../src/blog/index.js";

const basePost = {
  title: "A post",
  date: "2026-08-26",
  summary: "A summary",
  author: "domen",
  filename: "2026-08-26-a-post.md",
  body: "one two three",
};

test("normalizes post metadata", () => {
  assert.deepEqual(normalizePost(basePost), {
    ...basePost,
    slug: "a-post",
    readingMinutes: 1,
  });
});

test("sorts posts newest first without mutating input", () => {
  const posts = [
    { ...basePost, date: "2026-08-25", slug: "older" },
    { ...basePost, date: "2026-08-27", slug: "newer" },
  ];
  assert.deepEqual(sortPosts(posts).map((post) => post.slug), ["newer", "older"]);
  assert.deepEqual(posts.map((post) => post.slug), ["older", "newer"]);
  assert.equal(latestPost(posts)?.slug, "newer");
});

test("formats dates in UTC", () => {
  assert.equal(formatPostDate("2026-08-26", "en"), "Aug 26, 2026");
  assert.equal(formatPostDate(new Date("2026-08-26T18:00:00Z"), "en"), "Aug 26, 2026");
});

test("renders escaped RSS feeds", () => {
  const xml = renderRssFeed({
    title: "Site & Kit",
    description: "Shared <features>",
    site: "https://example.com/",
    items: [{
      title: "Post & title",
      description: "Body <text>",
      date: "2026-09-05",
      link: "/blog/post/",
    }],
  });

  assert.match(xml, /<title>Site &amp; Kit<\/title>/);
  assert.match(xml, /<description>Shared &lt;features&gt;<\/description>/);
  assert.match(xml, /<link>https:\/\/example\.com\/blog\/post\/<\/link>/);
  assert.match(xml, /<pubDate>Sat, 05 Sep 2026 00:00:00 GMT<\/pubDate>/);
});

test("selects the newest published Starlight blog entry", () => {
  const entries = [
    { id: "guide", data: { date: new Date("2026-08-30"), draft: false } },
    { id: "blog/draft", data: { date: new Date("2026-08-29"), draft: true } },
    { id: "blog/older", data: { date: new Date("2026-08-25"), draft: false } },
    { id: "blog/newer", data: { date: new Date("2026-08-27"), draft: false } },
  ];
  assert.equal(latestBlogEntry(entries)?.id, "blog/newer");
  assert.deepEqual(entries.map((entry) => entry.id), [
    "guide",
    "blog/draft",
    "blog/older",
    "blog/newer",
  ]);
  assert.deepEqual(
    sortBlogEntries(entries, { prefix: "", includeDrafts: true }).map((entry) => entry.id),
    ["guide", "blog/draft", "blog/newer", "blog/older"],
  );
});

test("validates dates and reading speed", () => {
  assert.throws(() => normalizePost({ ...basePost, date: "2026-02-30" }), /invalid post date/);
  assert.throws(() => readingMinutes("words", 0), /greater than zero/);
});
