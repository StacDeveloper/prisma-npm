import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export class OptimisticLockError extends Error {
    constructor(message = "Row was modified by another transaction") {
        super(message)
        this.name = "OptimisticLockError"
    }
}

interface OptimisticLockConfig {
    model: string
    id: number
    expectedVersion: number
    data: Record<string, any>
}

export async function optimisticLockUpdate(
    prisma: PrismaClient,
    config: OptimisticLockConfig
) {
    const client = prisma as any
    if (!client[config.model]) {
        throw new Error(`Model "${config.model}" not found on Prisma client`)
    }
    const result = await client[config.model].updateMany({
        where: { id: config.id, version: config.expectedVersion },
        data: { ...config.data, version: { increment: 1 } }
    })
    if (result.rows === 0) {
        throw new OptimisticLockError()
    }
    return result
}