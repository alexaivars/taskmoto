import { validate } from 'graphql';
import { schema } from '../packages/api/src/schema.ts';
import * as operations from '../packages/graphql/src/operations.ts';
for (const operation of Object.values(operations)) {
  if (
    typeof operation !== 'object' ||
    operation === null ||
    !('kind' in operation) ||
    operation.kind !== 'Document'
  )
    continue;
  const errors = validate(schema, operation);
  if (errors.length)
    throw new Error(errors.map((error) => error.message).join('\n'));
}
console.log('All client operations validated against Pothos');
