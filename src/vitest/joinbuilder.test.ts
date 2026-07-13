import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"
import { buildJoinQuery } from "../joins/JoinBuilder"

const prisma = new PrismaClient()

beforeAll(async () => {
    await prisma.user.deleteMany()
    await prisma.post.deleteMany()

    const tom = await prisma.user.create({ data: { email: "tom1@gmail.com", name: "tom" } })
    const jerry = await prisma.user.create({ data: { email: "jerry1@gmail.com", name: "jerry" } })
    await prisma.user.create({ data: { email: "doraemon1@gmail.com", name: "doraemon" } })

    await prisma.post.create({ data: { title: "This post is for tom", userId: tom.id } })
    await prisma.post.create({ data: { title: "This post if for jerry", userId: jerry.id } })
    await prisma.post.create({ data: { title: "Toms-2nd post", userId: tom.id } })
    await prisma.post.create({ data: { title: "Random-post", userId: null } })
})

afterAll(async () => {
    await prisma.$disconnect()
})

async function run(sql: ReturnType<typeof buildJoinQuery>) {
    return prisma.$queryRaw(sql)
}

describe("buildJoinQuery", () => {
    it("INNER JOIN returns only matched rows", async function () {
        const sql = buildJoinQuery({
            from: "User",
            select: ["User.email", "Post.title"],
            join: { type: "INNER", table: "Post", on: { fromColumn: "id", toColumn: "userId" } }
        })
        const rows: any[] = await run(sql)
        expect(rows).toHaveLength(4)
        expect(rows.some((r) => r.email === "tom1@gmail.com" && r.title === null)).toBe(true)
    })
    

})