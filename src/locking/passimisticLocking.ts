import { Prisma, PrismaClient } from "@prisma/client"

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIndentifier(name: string): string {
    if (!IDENT_RE.test(name)) throw new Error(`Unsafe identifier: ${name}`)
    return name
}

interface PessimisticLockConfig {
    table: string
    id: string
    mode?: "FOR UPDATE" | "FOR SHARE"
}

export async function pessimisticLock<T>(
    prisma: PrismaClient,
    config: PessimisticLockConfig,
    fn: (tx: Prisma.TransactionClient, row: any) => Promise<T>
): Promise<T> {
    const table = assertSafeIndentifier(config.table)
    const mode = config.mode ?? "FOR UPDATE"
    return prisma.$transaction(async (tx) => {
        const rows: any[] = await tx.$queryRaw(
            Prisma.sql`SELECT * FROM ${Prisma.raw(`"${table}"`)} WHERE id = ${config.id} ${Prisma.raw(mode)}`
        )
        if (!rows.length) throw new Error(`Row not found in ${table} with id ${config.id}`)
        return fn(tx, rows[0])
    })
}