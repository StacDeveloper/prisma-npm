import { Prisma, PrismaClient } from "@prisma/client"
import { assertSafeIdentifier, quoteIdentifier } from "../security/security"

interface PessimisticLockConfig {
    table: string
    id: string | number
    mode?: "FOR UPDATE" | "FOR SHARE"
    maxWait?: number
    timeout?: number

}

export async function pessimisticLock<T>(
    prisma: PrismaClient,
    config: PessimisticLockConfig,
    fn: (tx: Prisma.TransactionClient, row: any) => Promise<T>
): Promise<T> {
    const table = assertSafeIdentifier(config.table)
    const mode = config.mode ?? "FOR UPDATE"
    return prisma.$transaction(async (tx) => {
        const rows: any[] = await tx.$queryRaw(
            Prisma.sql`SELECT * FROM ${Prisma.raw(`${quoteIdentifier(table)}`)} WHERE id = ${config.id} ${Prisma.raw(mode)}`
        )
        if (!rows.length) throw new Error(`Row not found in ${table} with id ${config.id}`)
        return fn(tx, rows[0])
    },
        { maxWait: config.maxWait ?? 5000, timeout: config.timeout ?? 10000 }
    )
}