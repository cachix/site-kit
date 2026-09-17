# Cachix Site Kit

Shared website behavior for Cachix projects. The package keeps product identity in each website while centralizing interaction mechanics, documentation UX, and deployment helpers.

## Install

Pin an immutable full commit over HTTPS:

```json
{
  "dependencies": {
    "@cachix/site-kit": "https://codeload.github.com/cachix/site-kit/tar.gz/<full-commit-sha>"
  }
}
```

The HTTPS tarball works without GitHub SSH credentials and does not run a package build during installation. The package has independent subpath exports. Consumers only load the integrations they import.

## Starlight

```js
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import starlightLlmActions from 'starlight-llm-actions';
import { siteKitStarlight } from '@cachix/site-kit/starlight';
import { siteBlogOptions } from '@cachix/site-kit/starlight/blog';
import { siteLlmActionsOptions } from '@cachix/site-kit/starlight/llms';

starlight({
  title: 'Project',
  plugins: [
    siteKitStarlight(),
    starlightBlog(siteBlogOptions()),
    starlightLlmActions(siteLlmActionsOptions('Project-specific description.')),
  ],
});
```

`siteKitStarlight()` installs the shared UI stylesheet, terminal command copy behavior, its stylesheet, and the landing-page Hero override. Explicit consumer overrides are preserved. Astro content collection declarations stay in each consumer so their framework version can infer the schema without crossing a package type boundary.

### Markdown for agents

`siteLlmActionsOptions(description)` configures [starlight-llm-actions](https://github.com/holdenhewett/starlight-llm-actions) so coding agents read plaintext instead of the rendered HTML shell:

- Every docs page is prerendered as Markdown next to its HTML page, for example `/guides/example/` at `/guides/example/index.md` and `/` at `/index.md`. MDX and Starlight components are flattened to plain Markdown.
- Every HTML page carries `<link rel="alternate" type="text/markdown">`, which agents such as Codex follow.
- `/llms.txt` indexes the site and `/llms-full.txt` bundles every page. The description is required because the index links need an absolute `site` URL and a summary.
- Each page shows a page actions menu for copying the Markdown or opening it in a chat assistant. Disable it per page with `llmActions: false` in frontmatter.

The flattened rendering needs these packages installed in the consumer alongside `starlight-llm-actions`:

```sh
npm install @astrojs/mdx unified rehype-parse rehype-remark remark-gfm remark-stringify hast-util-select unist-util-remove
```

Agents such as Claude Code and Cursor ask for Markdown through the `Accept: text/markdown` header on the page URL itself. A static build cannot answer that at request time. `createMarkdownMiddleware()` from the Cloudflare module answers it from a Pages Function, see [Cloudflare](#cloudflare). Without a function, one Cloudflare Redirect Rule per zone does the same at the edge on every plan. The directory form of the Markdown URL exists so both stay a plain path append rather than a regex.

| Field | Value |
| --- | --- |
| When | `http.request.headers["accept"][0] contains "text/markdown" and ends_with(http.request.uri.path, "/")` |
| Type | Dynamic |
| Expression | `concat(http.request.uri.path, "index.md")` |
| Status | 302 |

Pages served outside the docs collection, such as a custom Astro page, have no Markdown sibling. The middleware falls back to HTML for them. A redirect rule needs `and not starts_with(http.request.uri.path, "/components/")`, or those pages answer 404 to Markdown requests.

## UI

Astro components are available at explicit exports:

```astro
---
import Button from '@cachix/site-kit/ui/Button.astro';
import FlowArrow from '@cachix/site-kit/ui/FlowArrow.astro';
import FlowArrowPair from '@cachix/site-kit/ui/FlowArrowPair.astro';
import LatestPostBanner from '@cachix/site-kit/ui/LatestPostBanner.astro';
import TerminalFrame from '@cachix/site-kit/ui/TerminalFrame.astro';
import VersionCompatibility from '@cachix/site-kit/ui/VersionCompatibility.astro';
---

<Button href="/docs/">Read the docs</Button>
<FlowArrow label="derivations" />
<FlowArrowPair outboundLabel="derivations" returnLabel="logs" />
<VersionCompatibility version="1.2" />
<VersionCompatibility version="1.3" kind="changed">
  The default behavior changed.
</VersionCompatibility>
```

`VersionCompatibility` renders a compact “New in version” notice when used
self-closing. Set `kind="changed"` and provide body content for behavior changes;
the component enforces those two forms during rendering.

`FlowArrowPair` uses the Obrador duplex connector as its base and adds an optional arrowhead arrival spread. Set `arrival={false}` to remove the endpoint effect. Override `--csk-flow-outbound-color`, `--csk-flow-return-color`, and `--csk-flow-pair-length` locally to preserve each website's palette and layout. Individual arrows also expose `--csk-flow-delay`, `--csk-flow-duration`, and `--csk-flow-timing`. Responsive compact layouts can set `--csk-flow-label-display`, `--csk-flow-packet-display`, or `--csk-flow-arrival-display` to `none` without targeting component internals.

Non-Astro sites can import `@cachix/site-kit/ui/styles.css` and render the same `csk-*` class contract. Each website overrides the `--csk-*` custom properties to retain its own palette and typography.

## Motion

```js
import { createMotionLifecycle } from '@cachix/site-kit/motion';

const lifecycle = createMotionLifecycle({
  target: document.querySelector('[data-demo]'),
  onChange(active) {
    if (active) start();
    else pause();
  },
});
```

The lifecycle combines viewport visibility, page visibility, and reduced-motion preference. Product-specific timelines stay in each website.

## Cloudflare

```js
// functions/_middleware.js
import { createBasicAuthMiddleware, createMarkdownMiddleware } from '@cachix/site-kit/cloudflare';

export const onRequest = [
  createBasicAuthMiddleware({ realm: 'project preview' }),
  createMarkdownMiddleware(),
];
```

`createMarkdownMiddleware()` serves the prebuilt `index.md` beside a page when the request prefers `text/markdown` over `text/html`, with `Content-Location` and `Vary: Accept` set. Browsers never send that type, so they keep getting HTML, and pages without a Markdown sibling fall through to HTML as well. Pass `{ redirect: true }` to answer with a 302 to the Markdown file instead of its body. Add a `_routes.json` that excludes `/_astro/*` and other asset paths so the function only runs for pages.

`createGitHubMetadataHandler()` provides the shared edge-cached stars and latest-release endpoint.

## Checks

```console
cachix-site-check-links dist https://project.example
```

The checker validates generated internal routes and fragments without requiring a framework.

The package has no install scripts or runtime dependencies.

## Development

```console
npm ci
npm run check
```

The check runs the unit tests, builds a Starlight fixture, verifies the generated output, and checks the package contents.

## License

Apache-2.0
