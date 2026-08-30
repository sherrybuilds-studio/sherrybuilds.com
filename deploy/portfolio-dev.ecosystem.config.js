// PM2 definition for the *dev* server (`portfolio-dev`, :3005). Prepared by
// the 2026-08-28 security sweep (finding portfolio-next:snapshot-route-public)
// and NOT applied automatically.
//
// Today portfolio-dev exists only in PM2's runtime dump and runs
// `npm run dev -- -H 0.0.0.0 -p 3005`. Binding 0.0.0.0 relies on ufw alone
// to keep :3005 off the internet, and if a container ever publishes a port
// on 0.0.0.0 the empty DOCKER-USER chain bypasses ufw. This file binds the
// dev server to the Tailscale address only, which is the sole legitimate
// way anyone reaches it.
//
// Activate (human, on the VPS):
//     pm2 delete portfolio-dev
//     pm2 start /home/sherry/frontend/sherrybuilds-os/deploy/portfolio-dev.ecosystem.config.js
//     pm2 save
//     ss -ltnp | grep 3005     # expect 100.78.223.103:3005, not 0.0.0.0:3005
// Rollback:
//     pm2 delete portfolio-dev
//     cd /home/sherry/frontend/sherrybuilds-os && pm2 start npm --name portfolio-dev -- run dev -- -H 0.0.0.0 -p 3005
//     pm2 save
module.exports = {
  apps: [
    {
      name: "portfolio-dev",
      cwd: "/home/sherry/frontend/sherrybuilds-os",
      script: "npm",
      args: "run dev -- -H 100.78.223.103 -p 3005",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 4000,
      min_uptime: 10000,
      max_restarts: 10,
      max_memory_restart: "1G",
    },
  ],
};
