module.exports = {
  apps: [
    {
      name: "openmediamap",
      script: "server.js",
      cwd: __dirname,

      time: true,
      max_restarts: 10,
      restart_delay: 1000,

      env_production: {
        NODE_ENV: "production",
        PORT: 5000,

        // ===== Firebase Admin =====
        GOOGLE_APPLICATION_CREDENTIALS:
          "/etc/openmediamap/firebase-service-account.json",

        // ===== Postgres =====
        // Your old .env used DATABASE_URL, so we mirror that here.
        // Example format:
        // postgres://USER:PASSWORD@HOST:PORT/DBNAME
        DATABASE_URL: "postgres://postgres:thebestwebsitemanagerlol@localhost:5432/records",

        // ===== DigitalOcean Spaces =====
        // Your code uses: new AWS.Endpoint(process.env.SPACES_ENDPOINT)
        // So keep this as the hostname (no https://)
        SPACES_ENDPOINT: "nyc3.digitaloceanspaces.com",

        // Your services/spaces.js defaults SPACES_REGION to "us-east-1".
        // Keep that unless you have a reason to change.
        SPACES_REGION: "us-east-1",

        // Fill these in with your real key/secret
        SPACES_KEY: "DO801WY3PNXPN2CV48NE",
        SPACES_SECRET: "MvBkco+tToR5hI9hec9TWSQWhnf7xbDPtYECrQrcZj8",

        // Optional but likely used elsewhere in your app:
        SPACES_BUCKET: "openmediamap",
        SPACES_CDN: "https://openmediamap.nyc3.cdn.digitaloceanspaces.com",
      },
    },
  ],
};
