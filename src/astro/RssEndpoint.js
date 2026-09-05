import { getCollection } from "astro:content";
import { renderRssFeed } from "../blog/index.js";

const config = import.meta.env.CSK_RSS_CONFIG;

export async function GET({ site, url }) {
  const origin = site ?? url.origin;
  const entries = (await getCollection(config.collection))
    .filter((entry) => !entry.data.draft)
    .sort((left, right) => new Date(right.data.date).valueOf() - new Date(left.data.date).valueOf());
  const items = entries.map((entry) => ({
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    link: new URL(`${config.itemBase}${entry.id.replace(/^blog\//, "").replace(/\/index$/, "")}/`, origin).href,
  }));

  return new Response(renderRssFeed({
    title: config.title,
    description: config.description,
    site: new URL("/", origin).href,
    items,
  }), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
