# Cachix Site Kit

Shared website behavior for Cachix projects. The package keeps product identity in each website while centralizing interaction mechanics, documentation UX, and deployment helpers.

## Install

Pin an immutable tag or commit:

```json
{
  "dependencies": {
    "@cachix/site-kit": "github:cachix/site-kit#v0.1.0"
  }
}
```

The package has independent subpath exports. Consumers only load the integrations they import.

## Starlight

```js
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import starlightLlmsTxt from 'starlight-llms-txt';
import { siteKitStarlight } from '@cachix/site-kit/starlight';
import { siteBlogOptions } from '@cachix/site-kit/starlight/blog';
import { siteLlmsOptions } from '@cachix/site-kit/starlight/llms';

starlight({
  title: 'Project',
  plugins: [
    siteKitStarlight(),
    starlightBlog(siteBlogOptions()),
    starlightLlmsTxt(siteLlmsOptions('Project-specific description.')),
  ],
});
```

`siteKitStarlight()` installs the shared UI stylesheet, terminal command copy behavior, its stylesheet, and the landing-page Hero override. Explicit consumer overrides are preserved. Astro content collection declarations stay in each consumer so their framework version can infer the schema without crossing a package type boundary.

## UI

Astro components are available at explicit exports:

```astro
---
import Button from '@cachix/site-kit/ui/Button.astro';
import FlowArrow from '@cachix/site-kit/ui/FlowArrow.astro';
import FlowArrowPair from '@cachix/site-kit/ui/FlowArrowPair.astro';
import LatestPostBanner from '@cachix/site-kit/ui/LatestPostBanner.astro';
import TerminalFrame from '@cachix/site-kit/ui/TerminalFrame.astro';
---

<Button href="/docs/">Read the docs</Button>
<FlowArrow label="derivations" />
<FlowArrowPair outboundLabel="derivations" returnLabel="logs" />
```

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
import { createBasicAuthMiddleware } from '@cachix/site-kit/cloudflare';

export const onRequest = createBasicAuthMiddleware({
  realm: 'project preview',
});
```

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
