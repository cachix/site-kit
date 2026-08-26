import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import starlightLlmsTxt from 'starlight-llms-txt';
import { siteKitStarlight } from '@cachix/site-kit/starlight';
import { siteBlogOptions } from '@cachix/site-kit/starlight/blog';
import { siteLlmsOptions } from '@cachix/site-kit/starlight/llms';

export default defineConfig({
  site: 'https://site-kit.invalid/',
  integrations: [
    starlight({
      title: 'Site Kit',
      plugins: [
        siteKitStarlight(),
        starlightBlog(siteBlogOptions()),
        starlightLlmsTxt(siteLlmsOptions('A fixture proving the shared Cachix Starlight integrations.')),
      ],
    }),
  ],
});
