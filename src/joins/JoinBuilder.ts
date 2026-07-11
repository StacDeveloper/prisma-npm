import { Prisma, PrismaClient } from "@prisma/client"

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL OUTER" | "CROSS"

class JoinBuilder {
    #selects: string[] = ["*"]
    #baseTable: string = ""
    #joins: { type: JoinType, table: string; on?: string }[] = []
    #whereClause?: Prisma.Sql

    from(table: string) {
        this.#baseTable = table
        return this
    }

    select(...cols: string[]) {
        this.#selects = cols
        return this
    }
    join(type: JoinType, table: string, on?: string) {
        on ? this.#joins.push({ type, table, on }) : this.#joins.push({ type, table })
        return this
    }
    where(sql: Prisma.Sql) {
        this.#whereClause = sql
        return this
    }
    build(): Prisma.Sql {
        let query = Prisma.sql`SELECT ${Prisma.raw(this.#selects.join(', '))} FROM ${Prisma.raw(this.#baseTable)}`
        for (const j of this.#joins) {
            if (j.type === "CROSS") {
                query = Prisma.sql`${query} CROSS JOIN ${Prisma.raw(j.table)}`
            } else {
                query = Prisma.sql`${query} ${Prisma.raw(j.type)} JOIN ${Prisma.raw(j.table)} ON ${Prisma.raw(j.on!)}`
            }
        }

        if (this.#whereClause) {
            query = Prisma.sql`${query} WHERE ${this.#whereClause}`
        }
        return query
    }

}

const prisma = new PrismaClient()
const query = new JoinBuilder().from("User u").select("u.id", "p.id as postId", "p.title").join("LEFT", "Post p", "p.userId = u.id").build()

const result = await prisma.$queryRaw(query)