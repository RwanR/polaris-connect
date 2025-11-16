module.exports = {
  apps: [
    {
      name: "newstore-api",
      script: "./api/index.js",
      output: "/var/log/newstore/out.log",
      error: "/var/log/newstore/error.log",
      log: "/var/log/newstore/combined.log",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
