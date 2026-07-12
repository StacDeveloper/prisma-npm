import { Prisma, PrismaClient } from "@prisma/client"

type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL OUTER" | "CROSS"

interface JoinCondition {
    fromColumn: string
    toColumn: string
}

interface JoinConfig {
    from: string
    select?: string[]
    join?: {
        type: JoinType,
        table: string,
        on?: JoinCondition
    }
    where: {
        column: string
        op: '=' | '!=' | '>' | '<' | '>=' | '<=';
        value: any
    }
}

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIndentifier(name: string): string {
    const parts = name.split(/\s+as\s+/i)
    const core = parts[0]?.trim()
    const segments = core?.split(".")
    for (const seg of segments!) {
        if (!IDENT_RE.test(seg)) {
            throw new Error(`Unsafe or invalid identifier: ${name}`)
        }
    }
    return name
}


export function buildJoinQuery(config: JoinConfig): Prisma.Sql {
    const fromTable = assertSafeIndentifier(config.from)
    const selectCols = (config.select ?? ['*']).map(assertSafeIndentifier).join(', ')
    let query = Prisma.sql`SELECT ${Prisma.raw(selectCols)} FROM ${Prisma.raw(`"${fromTable}"`)}`;
    if (config.join) {
        const { type, table, on } = config.join
        const joinTable = assertSafeIndentifier(table)
        if (type === "CROSS") {
            query = Prisma.sql`${query} CROSS JOIN ${Prisma.raw(`"${joinTable}"`)}`;
        }
        else {
            if (!on) throw new Error(`on Condition is required for ${type} JOIN`)
            const fromCol = assertSafeIndentifier(on.fromColumn)
            const toCol = assertSafeIndentifier(on.toColumn)
            query = Prisma.sql`${query} ${Prisma.raw(type)} JOIN ${Prisma.raw(`"${joinTable}"`)} ON ${Prisma.raw(`"${fromTable}"."${fromCol}"`)} = ${Prisma.raw(`"${joinTable}"."${toCol}"`)}`;
        }
    }
    if (config.where) {
        const col = assertSafeIndentifier(config.where.column)
        const op = config.where.op
        query = Prisma.sql`${query} WHERE ${Prisma.raw(`"${col}"`)} ${Prisma.raw(op)} ${config.where.value}`
    }
    return query
}

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
