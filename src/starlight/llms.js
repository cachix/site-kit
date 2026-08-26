export function siteLlmsOptions(description, options = {}) {
  if (typeof description !== "string" || description.trim() === "") {
    throw new TypeError("description must be a non-empty string");
  }
  return { description, ...options };
}
