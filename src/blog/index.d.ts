export interface PostInput {
  title: string;
  date: string;
  summary: string;
  author: string;
  slug?: string;
  filename?: string;
  body?: string;
  readingMinutes?: number;
  [key: string]: unknown;
}

export interface Post extends PostInput {
  slug: string;
  body: string;
  readingMinutes: number;
}

export interface BlogEntry {
  id: string;
  data: {
    date?: Date | string;
    draft?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RssItem {
  title: string;
  description: string;
  date: Date | string;
  link: string;
}

export function readingMinutes(body: string, wordsPerMinute?: number): number;
export function formatPostDate(date: Date | string, locale?: string): string;
export function normalizePost(post: PostInput): Readonly<Post>;
export function sortPosts(posts: PostInput[]): Readonly<Post>[];
export function latestPost(posts: PostInput[]): Readonly<Post> | undefined;
export function renderRssFeed(options: {
  title: string;
  description: string;
  site: string | URL;
  items: RssItem[];
}): string;
export function latestBlogEntry<T extends BlogEntry>(
  entries: T[],
  prefix?: string,
): T | undefined;
export function sortBlogEntries<T extends BlogEntry>(
  entries: T[],
  options?: { prefix?: string; includeDrafts?: boolean },
): T[];
