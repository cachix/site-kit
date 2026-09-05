export function GET() {
  return Response.json({
    stars: 1234,
    release: "v0.1.0",
    releaseUrl: "https://github.com/cachix/site-kit/releases/tag/v0.1.0",
  });
}
