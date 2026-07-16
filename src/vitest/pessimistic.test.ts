import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { pessimisticLock } from '../locking/passimisticLocking';

const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL! as string } }
})


let userId: number;

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms))
}

beforeEach(async () => {
    await prisma.user.deleteMany()
    const user = await prisma.user.create({
        data: { email: "lock-pessimistic@test.com", name: "Original" }
    })
    userId = user.id
})

afterAll(async () => {
    await prisma.$disconnect()
})

describe('pessimisticLock', () => {
    it("returns the locked row and applies the update inside the callback", async () => {
        const result = await pessimisticLock(prisma, { table: "user", id: userId, mode: "FOR UPDATE" }, async (tx, row) => {
            expect(row.id).toBe(userId)
            return tx.user.update({ where: { id: row.id }, data: { name: "Locked Update" } })
        })
        expect(result?.name).toBe("Locked Update")
    })

    it("throw if the row does not exist", async () => {
        await expect(
            pessimisticLock(prisma, { table: "User", id: 99999 }, async (tx, row) => row)
        ).rejects.toThrow(/Row not found/)
    })

    it("blocks a second lock attempt until the first transaction releases it", async () => {
        const events: string[] = []
        const txA = pessimisticLock(
            prisma, { table: "user", id: userId, mode: "FOR UPDATE" }, async (tx, row) => {
                events.push("A:acquired")
                await sleep(1000)
                events.push("A: relesed")
                return row
            }
        )
        const txB = (async () => {
            await sleep(100)
            return (pessimisticLock(prisma, {
                table: "user", id: userId, mode: "FOR UPDATE"
            }, async function (tx, row) {
                events.push("B-acquired")
                return row
            }))

        })()

        await Promise.all([txA, txB])

        const releaseIndex = events.indexOf("A: releasing")
        const bAcquiredIndex = events.indexOf("B: acquired")
        expect(releaseIndex).toBeLessThan(bAcquiredIndex)

    }, 10000)

})