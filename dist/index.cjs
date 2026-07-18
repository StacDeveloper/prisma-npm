"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  OptimisticLockError: () => OptimisticLockError,
  buildJoinQuery: () => buildJoinQuery,
  optimisticLockUpdate: () => optimisticLockUpdate,
  pessimisticLock: () => pessimisticLock,
  withToolKit: () => withToolKit
});
module.exports = __toCommonJS(index_exports);

// src/joins/JoinBuilder.ts
var import_client = require("@prisma/client");

// src/security/security.ts
var IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
var MAX_IDENTIFIER_LENGTH = 63;
function validateSegment(segment) {
  if (segment.length === 0) {
    throw new Error("Identifier segment cannot be empty");
  }
  if (segment.length > MAX_IDENTIFIER_LENGTH) {
    throw new Error(`Identifier ${segment} exceeds ${MAX_IDENTIFIER_LENGTH} character limit(Postgres will silently truncate it)`);
  }
  if (!IDENT_RE.test(segment)) {
    throw new Error(`Unsafe or invalid identifier: ${segment}`);
  }
}
function assertSafeIdentifier(name) {
  validateSegment(name);
  return name;
}
function assertSafeQualifiedIdentifier(name) {
  const [core, ...rest] = name.split(/\s+as\s+/i);
  if (rest.length > 1) {
    throw new Error(`Invalid identifier expression: ${name}`);
  }
  const segment = core.trim().split(".");
  if (segment.length > 2) {
    throw new Error(`Invalid identifier expression: ${name}`);
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
function quotedQualifiedIdentifier(name) {
  assertSafeQualifiedIdentifier(name);
  const [core, alias] = name.split(/\s+as\s+/i);
  const segment = core.trim().split(".");
  const quotedCore = segment.map((seg) => quoteIdentifier(seg)).join(".");
  return alias ? `${quotedCore} as ${quoteIdentifier(alias.trim())}` : quotedCore;
}

// src/joins/JoinBuilder.ts
function buildJoinQuery(config) {
  const fromTable = assertSafeIdentifier(config.from);
  const selectCols = (config.select ?? ["*"]).map((c) => c === "*" ? c : quotedQualifiedIdentifier(c)).join(", ");
  let query = import_client.Prisma.sql`SELECT ${import_client.Prisma.raw(selectCols)} FROM ${import_client.Prisma.raw(`${quoteIdentifier(fromTable)}`)}`;
  if (config.join) {
    const { type, table, on } = config.join;
    const joinTable = assertSafeIdentifier(table);
    if (type === "CROSS") {
      query = import_client.Prisma.sql`${query} CROSS JOIN ${import_client.Prisma.raw(`${quoteIdentifier(joinTable)}`)}`;
    } else {
      if (!on) throw new Error(`on Condition is required for ${type} JOIN`);
      const fromCol = assertSafeIdentifier(on.fromColumn);
      const toCol = assertSafeIdentifier(on.toColumn);
      query = import_client.Prisma.sql`${query} ${import_client.Prisma.raw(type)} JOIN ${import_client.Prisma.raw(`${quoteIdentifier(joinTable)}`)} ON ${import_client.Prisma.raw(`${quoteIdentifier(fromTable)}.${quoteIdentifier(fromCol)}`)} = ${import_client.Prisma.raw(`${quoteIdentifier(joinTable)}.${quoteIdentifier(toCol)}`)}`;
    }
  }
  if (config.where) {
    const col = assertSafeIdentifier(config.where.column);
    const op = config.where.op;
    query = import_client.Prisma.sql`${query} WHERE ${import_client.Prisma.raw(`${quoteIdentifier(col)}`)} ${import_client.Prisma.raw(op)} ${config.where.value}`;
  }
  return query;
}

// src/locking/passimisticLocking.ts
var import_client2 = require("@prisma/client");
async function pessimisticLock(prisma, config, fn) {
  const table = assertSafeIdentifier(config.table);
  const mode = config.mode ?? "FOR UPDATE";
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw(
        import_client2.Prisma.sql`SELECT * FROM ${import_client2.Prisma.raw(`${quoteIdentifier(table)}`)} WHERE id = ${config.id} ${import_client2.Prisma.raw(mode)}`
      );
      console.log(rows);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OptimisticLockError,
  buildJoinQuery,
  optimisticLockUpdate,
  pessimisticLock,
  withToolKit
});
//# sourceMappingURL=index.cjs.map