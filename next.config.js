/** @type {import('next').NextConfig} */
function supabaseImageRemotePatterns() {
  /** Cualquier proyecto `*.supabase.co` (Storage público, firmas, render). */
  const patterns = [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
      pathname: '/storage/v1/**',
    },
  ];
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw) {
    try {
      const host = new URL(raw).hostname;
      if (host && !host.endsWith('.supabase.co')) {
        patterns.push({ protocol: 'https', hostname: host, pathname: '/storage/v1/**' });
      }
    } catch {
      /* ignore */
    }
  }
  /** Hosts extra, coma-separados (ej. CDN u otro dominio de imágenes). */
  const extra = process.env.NEXT_PUBLIC_CATALOG_IMAGE_HOSTS;
  if (extra) {
    for (const h of extra.split(',').map((s) => s.trim()).filter(Boolean)) {
      patterns.push({ protocol: 'https', hostname: h, pathname: '/**' });
    }
  }
  return patterns;
}

const nextConfig = {
  output: 'standalone',
  experimental: {},
  images: {
    remotePatterns: supabaseImageRemotePatterns(),
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
