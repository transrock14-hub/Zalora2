/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'cdn.dummyjson.com' },
      { protocol: 'https', hostname: 'fakestoreapi.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'd3t32hsnjxo7q6.cloudfront.net' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'static-assets.glossier.com' },
      { protocol: 'https', hostname: 'api.escuelajs.co' },
      { protocol: 'https', hostname: 'cdsassets.apple.com' },
      { protocol: 'https', hostname: 'www.clinique.com' },
      { protocol: 'https', hostname: 'www.smashbox.com' },
      { protocol: 'https', hostname: 'www.nyxcosmetics.com' },
      { protocol: 'https', hostname: 'www.dior.com' },
      { protocol: 'https', hostname: 'www.benefitcosmetics.com' },
      { protocol: 'https', hostname: 'www.purpicks.com' },
      { protocol: 'https', hostname: 'imancosmetics.com' },
      { protocol: 'https', hostname: 'www.fentybeauty.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.shopify.com' },
      { protocol: 'https', hostname: '**.ssl.cf1.rackcdn.com' },
      { protocol: 'https', hostname: 's3.amazonaws.com' },
    ],
    // Hostinger's image optimizer often fails on brand CDNs that require
    // browser referrers (Smashbox/Clinique/etc.), which shows as broken
    // product photos. Serve remotes as-is.
    unoptimized: true,
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig
