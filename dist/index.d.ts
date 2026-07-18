import * as _prisma_client_runtime_library from '@prisma/client/runtime/library';
import { Prisma, PrismaClient } from '@prisma/client';

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL OUTER" | "CROSS";
interface JoinCondition {
    fromColumn: string;
    toColumn: string;
}
interface JoinConfig {
    from: string;
    select?: string[];
    join?: {
        type: JoinType;
        table: string;
        on?: JoinCondition;
    };
    where?: {
        column: string;
        op: '=' | '!=' | '>' | '<' | '>=' | '<=';
        value: any;
    };
}
declare function buildJoinQuery(config: JoinConfig): Prisma.Sql;

interface PessimisticLockConfig {
    table: string;
    id: string | number;
    mode?: "FOR UPDATE" | "FOR SHARE";
    maxWait?: number;
    timeout?: number;
}
declare function pessimisticLock<T>(prisma: PrismaClient, config: PessimisticLockConfig, fn: (tx: Prisma.TransactionClient, row: any) => Promise<T>): Promise<T>;

declare class OptimisticLockError extends Error {
    constructor(message?: string);
}
interface OptimisticLockConfig {
    model: string;
    id: number;
    expectedVersion: number;
    data: Record<string, any>;
}
declare function optimisticLockUpdate(prisma: PrismaClient, config: OptimisticLockConfig): Promise<any>;

interface UnionSubQuery {
    from: string;
    select?: string[];
    where?: {
        column: string;
        op: '=' | '!=' | '>' | '<' | '>=' | '<=';
        value: any;
    };
}
interface UnionConfig {
    all?: boolean;
    queries: UnionSubQuery[];
}
declare function buildUnionQuery(config: UnionConfig): Prisma.Sql;

declare function withToolKit(prisma: PrismaClient): _prisma_client_runtime_library.DynamicClientExtensionThis<Prisma.TypeMap<_prisma_client_runtime_library.InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {
        $join: () => (config: Parameters<typeof buildJoinQuery>[0]) => Promise<unknown>;
        $lock: () => {
            pessimistic: (config: Parameters<typeof pessimisticLock>[1], fn: Parameters<typeof pessimisticLock>[2]) => Promise<unknown>;
            optimistic: (config: Parameters<typeof optimisticLockUpdate>[1]) => Promise<any>;
        };
        $union: () => (config: Parameters<typeof buildUnionQuery>[0]) => Promise<unknown>;
    };
}, {}>, Prisma.TypeMapCb<Prisma.PrismaClientOptions>, {
    result: {};
    model: {};
    query: {};
    client: {
        $join: () => (config: Parameters<typeof buildJoinQuery>[0]) => Promise<unknown>;
        $lock: () => {
            pessimistic: (config: Parameters<typeof pessimisticLock>[1], fn: Parameters<typeof pessimisticLock>[2]) => Promise<unknown>;
            optimistic: (config: Parameters<typeof optimisticLockUpdate>[1]) => Promise<any>;
        };
        $union: () => (config: Parameters<typeof buildUnionQuery>[0]) => Promise<unknown>;
    };
}>;

export { type JoinType, OptimisticLockError, buildJoinQuery, optimisticLockUpdate, pessimisticLock, withToolKit };
