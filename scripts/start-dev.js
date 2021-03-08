const path = require("path");
const concurrently = require("concurrently");
concurrently(
  [
    "npm:watch-*",
    {
      command: "yarn:dev:types",
      name: "api:types",
      prefixColor: "green",
      cwd: path.resolve(__dirname, "../services/api"),
    },
    {
      command: "yarn:dev:server",
      name: "api:server",
      prefixColor: "yellow",
      cwd: path.resolve(__dirname, "../services/api"),
    },
    {
      command: "yarn:dev:server",
      name: "web:server",
      prefixColor: "blue",
      cwd: path.resolve(__dirname, "../services/web"),
    },
  ],
  {
    prefix: "name",
    killOthers: ["failure", "success"],
    restartTries: 3,
    cwd: path.resolve(__dirname, "scripts"),
  }
).then(
  (commands) => commands.map((command) => `exited ${command.name}`),
  console.log
);
