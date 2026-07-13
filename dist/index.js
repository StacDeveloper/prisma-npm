// src/joins/JoinBuilder.ts
import { Prisma } from "@prisma/client";

// src/security/security.ts
var IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
var MAX_IDENTIFIER_LENGTH = 63;
function validateSegment(segment) {
  if (segment.length === 0) {
    throw new Error("Identifier segment cannot be empty");
  }
  if (segment.length > MAX_IDENTIFIER_LENGTH) {
    throw new Error(`Identifier "${segment}" exceeds ${MAX_IDENTIFIER_LENGTH} character limit(Postgres will silently truncate it)`);
  }
  if (!IDENT_RE.test(segment)) {
    throw new Error(`Unsafe or invalid identifier: "${segment}"`);
  }
}
function assertSafeIdentifier(name) {
  validateSegment(name);
  return name;
}
function assertSafeQualifiedIdentifier(name) {
  const [core, ...rest] = name.split(/\s+as\s+/i);
  if (rest.length > 1) {
    throw new Error(`Invalid identifier expression: "${name}"`);
  }
  const segment = core.trim().split(".");
  if (segment.length > 2) {
    throw new Error(`Invalid identifier expression: "${name}"`);
  }
  segment.forEach(validateSegment);
  if (rest.length === 1) {
    validateSegment(rest[0].trim());
  }
  return name;
}
function quoteIdentifier(name) {
  return `"${name}"`;
}

// src/joins/JoinBuilder.ts
function buildJoinQuery(config) {
  const fromTable = assertSafeIdentifier(config.from);
  const selectCols = (config.select ?? ["*"]).map((c) => c === "*" ? c : assertSafeQualifiedIdentifier(c)).join(", ");
  let query = Prisma.sql`SELECT ${Prisma.raw(selectCols)} FROM ${Prisma.raw(`"${quoteIdentifier(fromTable)}"`)}`;
  if (config.join) {
    const { type, table, on } = config.join;
    const joinTable = assertSafeIdentifier(table);
    if (type === "CROSS") {
      query = Prisma.sql`${query} CROSS JOIN ${Prisma.raw(`"${quoteIdentifier(joinTable)}"`)}`;
    } else {
      if (!on) throw new Error(`on Condition is required for ${type} JOIN`);
      const fromCol = assertSafeIdentifier(on.fromColumn);
      const toCol = assertSafeIdentifier(on.toColumn);
      query = Prisma.sql`${query} ${Prisma.raw(type)} JOIN ${Prisma.raw(`"${quoteIdentifier(joinTable)}"`)} ON ${Prisma.raw(`"${quoteIdentifier(fromTable)}"."${quoteIdentifier(fromCol)}"`)} = ${Prisma.raw(`"${quoteIdentifier(joinTable)}"."${quoteIdentifier(toCol)}"`)}`;
    }
  }
  if (config.where) {
    const col = assertSafeIdentifier(config.where.column);
    const op = config.where.op;
    query = Prisma.sql`${query} WHERE ${Prisma.raw(`"${quoteIdentifier(col)}"`)} ${Prisma.raw(op)} ${config.where.value}`;
  }
  return query;
}

// src/locking/passimisticLocking.ts
import { Prisma as Prisma2 } from "@prisma/client";
async function pessimisticLock(prisma, config, fn) {
  const table = assertSafeIdentifier(config.table);
  const mode = config.mode ?? "FOR UPDATE";
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw(
        Prisma2.sql`SELECT * FROM ${Prisma2.raw(`${quoteIdentifier(table)}`)} WHERE id = ${config.id} ${Prisma2.raw(mode)}`
      );
      if (!rows.length) throw new Error(`Row not found in ${table} with id ${config.id}`);
      return fn(tx, rows[0]);
    },
    { maxWait: config.maxWait ?? 5e3, timeout: config.timeout ?? 1e4 }
  );
}

// src/locking/optimisticLocking.ts
var OptimisticLockError = class extends Error {
  constructor(message = "Row was modified by another transaction") {
    super(message);
    this.name = "OptimisticLockError";
  }
};
async function optimisticLockUpdate(prisma, config) {
  const client = prisma;
  if (!client[config.model]) {
    throw new Error(`Model "${config.model}" not found on Prisma client`);
  }
  const result = await client[config.model].updateMany({
    where: { id: config.id, version: config.expectedVersion },
    data: { ...config.data, version: { increment: 1 } }
  });
  if (result.count === 0) {
    throw new OptimisticLockError();
  }
  return result;
}

// src/index.ts
function withToolKit(prisma) {
  return prisma.$extends({
    name: "prisma-toolkit",
    client: {
      async $join(config) {
        const sql = buildJoinQuery(config);
        return prisma.$queryRaw(sql);
      },
      $lock: {
        pessimistic: (config, fn) => pessimisticLock(prisma, config, fn),
        optimistic: (config) => optimisticLockUpdate(prisma, config)
      }
    }
  });
}
export {
  OptimisticLockError,
  buildJoinQuery,
  optimisticLockUpdate,
  pessimisticLock,
  withToolKit
};
//# sourceMappingURL=index.js.map