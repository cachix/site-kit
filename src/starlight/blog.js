export const defaultAuthors = Object.freeze({
  domen: Object.freeze({
    name: "Domen Kožar",
    url: "https://github.com/domenkozar",
  }),
});

export function siteBlogOptions(options = {}) {
  return {
    title: "Blog",
    authors: defaultAuthors,
    ...options,
  };
}
