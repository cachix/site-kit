const DEFAULT_LLM_ACTIONS = Object.freeze({
  renderMarkdown: "simple",
  linkAlternate: true,
});

export function siteLlmActionsOptions(description, options = {}) {
  if (typeof description !== "string" || description.trim() === "") {
    throw new TypeError("description must be a non-empty string");
  }
  const { llmsTxt, ...rest } = options;
  const llmsTxtOptions =
    llmsTxt === false ? false : { description, ...(typeof llmsTxt === "object" ? llmsTxt : {}) };
  return { ...DEFAULT_LLM_ACTIONS, ...rest, llmsTxt: llmsTxtOptions };
}
