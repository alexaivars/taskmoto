const path = require('path');
const { concurrently } = require('concurrently');
const { result } = concurrently(
  [
    {
      command: 'yarn:dev:types',
      name: 'api:types',
      prefixColor: 'green',
      cwd: path.resolve(__dirname, '../packages/api'),
    },
    {
      command: 'yarn:dev:server',
      name: 'api:server',
      prefixColor: 'cyan',
      cwd: path.resolve(__dirname, '../packages/api'),
    },
    // {
    //   command: "yarn:dev:generate",
    //   name: "web:server",
    //   prefixColor: "blue",
    //   cwd: path.resolve(__dirname, "../packages/web"),
    // },
    {
      command: 'yarn:dev:ui',
      name: 'web:ui',
      prefixColor: 'cyan',
      cwd: path.resolve(__dirname, '../packages/web'),
    },
    {
      command: 'yarn:dev:server',
      name: 'web:server',
      prefixColor: 'blue',
      cwd: path.resolve(__dirname, '../packages/web'),
    },
  ],
  {
    prefix: 'name',
    killOthersOn: ['failure'],
    restartTries: 3,
    cwd: path.resolve(__dirname, 'scripts'),
  },
);
result.then(
  (commands) => commands.map((command) => `exited ${command.name}`),
  console.log,
);
