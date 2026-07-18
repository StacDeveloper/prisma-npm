import { PrismaClient, Prisma } from "@prisma/client"
import { buildJoinQuery } from "./joins/JoinBuilder"
import { pessimisticLock } from "./locking/passimisticLocking"
import { optimisticLockUpdate } from "./locking/optimisticLocking"
import { buildUnionQuery } from "./unions/union"


export function withToolKit(
    prisma: PrismaClient
) {
    return prisma.$extends({
        name: "prisma-toolkit",
        client: {
            async $join(config: Parameters<typeof buildJoinQuery>[0]) {
                const sql = buildJoinQuery(config)
                return prisma.$queryRaw(sql)
            },
            $lock: {
                pessimistic: (config: Parameters<typeof pessimisticLock>[1], fn: Parameters<typeof pessimisticLock>[2]) => pessimisticLock(prisma, config, fn),
                optimistic: (config: Parameters<typeof optimisticLockUpdate>[1]) => optimisticLockUpdate(prisma, config)
            },
            async $union(config: Parameters<typeof buildUnionQuery>[0]) {
                const sql = buildUnionQuery(config)
                return prisma.$queryRaw(sql)
            }
        }
    })
}

export { buildJoinQuery } from "./joins/JoinBuilder"
export { pessimisticLock } from "./locking/passimisticLocking"
export { optimisticLockUpdate, OptimisticLockError } from "./locking/optimisticLocking"
export type { JoinType } from "./joins/JoinBuilder"