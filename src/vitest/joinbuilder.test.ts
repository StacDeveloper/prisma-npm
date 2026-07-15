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

    await prisma.post.create({ data: { title: "This post is for tom", userId: tom.id, content: "This is content 1" } })
    await prisma.post.create({ data: { title: "This post if for jerry", userId: jerry.id, content: "This is content 2" } })
    await prisma.post.create({ data: { title: "Toms-2nd post", userId: tom.id, content: "This is content 3" } })
    await prisma.post.create({ data: { title: "Random-post", userId: null, content: "Done with content" } })
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
        const rows = await run(sql)
        console.table(rows)
        expect(rows).toHaveLength(3)
    })
    it("LEFT JOIN includes users with no posts", async () => {
        const sql = buildJoinQuery({
            from: "User",
            select: ["User.email", "Post.title"],
            join: { type: "LEFT", table: "Post", on: { fromColumn: "id", toColumn: "userId" } },
        })
        const rows = await run(sql)
        console.table(rows)
        expect(rows).toHaveLength(4)
        const array = Array.isArray(rows)
        expect(array && rows.some((row) => row.email === "doraemon1@gmail.com" && row.title === null)).toBe(array ? true : false)
    })

    it("RIGHT JOIN includes posts with no user", async () => {
        const sql = buildJoinQuery({
            from: "User",
            select: ["User.email", "Post.title"],
            join: { type: "RIGHT", table: "Post", on: { fromColumn: "id", toColumn: "userId" } }
        })
        const rows = await run(sql)
        console.table(rows)
        expect(rows).toHaveLength(4)
    })
    it("CROSS JOIN returns the full cartesian product", async () => {
        const sql = buildJoinQuery({
            from: "User",
            select: ["User.email", "Post.title"],
            join: { type: "CROSS", table: "Post" }
        })
        const rows = await run(sql)
        console.table(rows)
        expect(rows).toHaveLength(3 * 4)
    })
    it("thows error when a CROSS-JOIN is missing on", async () => {
        expect(function () {
            buildJoinQuery({
                from: "User",
                join: { type: "LEFT", table: "Post" }
            })
        }).toThrow()
    })
    it("rejects unsafe table names", () => {
        expect(function () {
            buildJoinQuery({ from: "User; DROP TABLE users;--" })
        }).toThrow()
    })
})