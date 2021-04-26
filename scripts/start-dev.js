const path = require("path");
const concurrently = require("concurrently");
concurrently(
  [
    // {
    //   command: "yarn:dev",
    //   name: "ui",
    //   prefixColor: "pink",
    //   cwd: path.resolve(__dirname, "../packages/ui"),
    // },
    {
      command: "yarn:dev:types",
      name: "api:types",
      prefixColor: "green",
      cwd: path.resolve(__dirname, "../packages/api"),
    },
    {
      command: "yarn:dev:server",
      name: "api:server",
      prefixColor: "yellow",
      cwd: path.resolve(__dirname, "../packages/api"),
    },
    // {
    //   command: "yarn:dev:generate",
    //   name: "web:server",
    //   prefixColor: "blue",
    //   cwd: path.resolve(__dirname, "../packages/web"),
    // },
    {
      command: "yarn:dev:server",
      name: "web:server",
      prefixColor: "blue",
      cwd: path.resolve(__dirname, "../packages/web"),
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
