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

export function readingMinutes(body: string, wordsPerMinute?: number): number;
export function formatPostDate(date: Date | string, locale?: string): string;
export function normalizePost(post: PostInput): Readonly<Post>;
export function sortPosts(posts: PostInput[]): Readonly<Post>[];
export function latestPost(posts: PostInput[]): Readonly<Post> | undefined;
export function latestBlogEntry<T extends BlogEntry>(
  entries: T[],
  prefix?: string,
): T | undefined;
