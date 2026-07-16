import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"
import { OptimisticLockError, optimisticLockUpdate } from "../locking/optimisticLocking"

const prisma = new PrismaClient()
let userId: number;
let version: number = 0

beforeEach(async () => {
    await prisma.user.deleteMany()
    const user = await prisma.user.create({
        data: { email: "lock-optimistic@test.com", name: "original" }
    })
    userId = user.id
})

afterAll(async () => {
    await prisma.$disconnect()
})

describe("optimisticLockUpdate", () => {
    it("succeeds when expectedVersion matches current version", async () => {
        const result = await optimisticLockUpdate(prisma, {
            model: "user",
            id: userId,
            expectedVersion: version,
            data: { name: "Updated" }
        })
        expect(result.count).toBe(1)
        const updated = await prisma.user.findUnique({ where: { id: userId } })
        expect(updated?.name).toBe("Updated")
        expect(updated?.version).toBe(version + 1)
    })
    it("throws optimisticLockError when version is stale", async () => {
        await optimisticLockUpdate(prisma, {
            model: "user",
            id: userId,
            expectedVersion: version,
            data: { name: "First Update" }
        })
        await expect(
            optimisticLockUpdate(prisma, {
                model: "user",
                id: userId,
                expectedVersion: version,
                data: { name: "Should Not apply" }
            })
        ).rejects.toThrow(OptimisticLockError)

        const row = await prisma.user.findUnique({ where: { id: userId } })
        expect(row?.name).toBe("First Update")
    })
    it("only one writer wins in a concurrent race on the same version", async () => {
        const results = await Promise.allSettled([
            optimisticLockUpdate(prisma, { model: "user", id: userId, expectedVersion: version, data: { name: "Writer-A" } }),
            optimisticLockUpdate(prisma, { model: "user", id: userId, expectedVersion: version, data: { name: "Writer-B" } })
        ])
        const fullFilled = results.filter((row) => row.status === "fulfilled")
        const rejected = results.filter((row) => row.status === "rejected")

        expect(fullFilled).toHaveLength(1)
        expect(rejected).toHaveLength(1)

        const row = await prisma.user.findUnique({ where: { id: userId } })
        expect(row?.version).toBe(version + 1)
    })
    it("throws a plain error for an unknown model name", async function () {
        await expect(
            optimisticLockUpdate(prisma, {
                model: "notARealModel",
                id: userId,
                expectedVersion: version,
                data: {}
            })
        ).rejects.toThrow(/not found on Prisma client/)
    })

})