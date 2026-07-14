/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Tenant subdomains (e.g. acme.localhost:3000) are a different origin from
  // localhost:3000 — the dev server's cross-origin request check would
  // otherwise reject them. Mirrors NEXT_PUBLIC_TENANT_ROOT_HOST in .env.
  allowedDevOrigins: ["*.localhost"],
}

export default nextConfig
