# prisma-pg-toolkit

Joins (`INNER` / `LEFT` / `RIGHT` / `FULL OUTER` / `CROSS`) and locking (pessimistic / optimistic) helpers for **Prisma + PostgreSQL**.

Prisma's client only performs `LEFT JOIN`-style relation loading internally, and has no built-in row locking. This library fills both gaps with safe, config-driven APIs — no raw SQL required from consumers.

> **Postgres only.** Join syntax (`FULL OUTER JOIN`, `RIGHT JOIN`) and locking (`FOR UPDATE`) differ across databases — this library targets Postgres specifically.

## Install

```bash
npm install prisma-pg-toolkit
```

Requires `@prisma/client` v5+ as a peer dependency.

## Setup

```ts
import { PrismaClient } from '@prisma/client';
import { withToolKit } from 'prisma-pg-toolkit';

const base = new PrismaClient();
const prisma = withToolKit(base);
```

## Joins

```ts
const result = await prisma.$join({
  from: 'User',
  select: ['User.email', 'Post.title'],
  join: {
    type: 'LEFT', // 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' | 'CROSS'
    table: 'Post',
    on: { fromColumn: 'id', toColumn: 'userId' },
  },
  where: { column: 'published', op: '=', value: true }, // optional
});
```

`CROSS` joins don't need an `on` clause.

## Pessimistic locking

Locks a row (`SELECT ... FOR UPDATE`) inside a transaction. Other callers requesting the same row **wait** until the transaction commits or rolls back.

```ts
await prisma.$lock.pessimistic(
  { table: 'User', id: 1, mode: 'FOR UPDATE' }, // or 'FOR SHARE'
  async (tx, row) => {
    return tx.user.update({ where: { id: row.id }, data: { name: 'Updated' } });
  }
);
```

## Optimistic locking

Requires a `version: Int` column on the model. Update succeeds only if `expectedVersion` still matches the current row; otherwise throws `OptimisticLockError`, and the caller should re-fetch and retry.

```ts
import { OptimisticLockError } from 'prisma-pg-toolkit';

try {
  await prisma.$lock.optimistic({
    model: 'user', // matches your Prisma model accessor, lowercase
    id: 1,
    expectedVersion: 3,
    data: { name: 'New Name' },
  });
} catch (err) {
  if (err instanceof OptimisticLockError) {
    // row changed since you read it — re-fetch and retry
  }
}
```

## Security

Table and column names are validated against a strict identifier pattern before being spliced into SQL — only letters, digits, and underscores, matching Postgres' identifier rules. Values are always passed as parameterized bindings via Prisma's tagged-template `$queryRaw`, never string-concatenated.

## Testing

Manual test scripts demonstrating all join types and both locking strategies against seeded data are in [`src/testing`](./src/testing) on GitHub — useful as runnable examples.

## License

MIT