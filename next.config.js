/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Add a rule to handle canvas module
    config.module.rules.push({
      test: /\.(png|jpg|jpeg|gif|svg)$/i,
      type: 'asset/resource',
    })

    // Handle canvas module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    }

    return config
  },
}

module.exports = nextConfig 