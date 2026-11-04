import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Import files are up to 5 MB, which grows by a third when sent on to Frappe.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // The reset key is in this page's address, so it must never travel in a Referer header.
      { source: "/reset-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/verify/:code", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/pay/:code", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ]
  },
}

export default nextConfig
