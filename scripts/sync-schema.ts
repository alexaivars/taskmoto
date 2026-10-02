import {
  graphqlSync,
  getIntrospectionQuery,
  printSchema,
  validateSchema,
} from 'graphql';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { schema } from '../packages/api/src/schema.ts';
const errors = validateSchema(schema);
if (errors.length)
  throw new Error(errors.map((error) => error.message).join('\n'));
const result = graphqlSync({ schema, source: getIntrospectionQuery() });
if (result.errors)
  throw new Error(result.errors.map((error) => error.message).join('\n'));
const directory = fileURLToPath(
  new URL('../packages/graphql/src/generated/', import.meta.url),
);
mkdirSync(directory, { recursive: true });
for (const [name, content] of Object.entries({
  'schema.graphql': printSchema(schema) + '\n',
  'introspection.ts':
    '// Derived automatically from the Pothos schema. Do not edit.\nexport const introspection = ' +
    JSON.stringify(result.data) +
    ' as const;\n',
})) {
  const file = directory + name;
  let previous = '';
  try {
    previous = readFileSync(file, 'utf8');
  } catch {
    /* First synchronization. */
  }
  if (previous !== content) writeFileSync(file, content);
}
console.log('GraphQL contract synchronized from Pothos');
