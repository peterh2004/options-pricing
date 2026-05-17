/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Plotly is large; load only on client
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
