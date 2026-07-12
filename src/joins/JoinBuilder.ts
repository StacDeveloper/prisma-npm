import { Prisma } from "@prisma/client"
import { assertSafeIdentifier, assertSafeQualifiedIdentifier, quoteIdentifier } from "../security/security"

export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL OUTER" | "CROSS"

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
    where?: {
        column: string
        op: '=' | '!=' | '>' | '<' | '>=' | '<=';
        value: any
    }
}


export function buildJoinQuery(config: JoinConfig): Prisma.Sql {
    const fromTable = assertSafeIdentifier(config.from)
    const selectCols = (config.select ?? ['*']).map((c) => (c === '*' ? c : assertSafeQualifiedIdentifier(c))).join(', ')
    let query = Prisma.sql`SELECT ${Prisma.raw(selectCols)} FROM ${Prisma.raw(`"${quoteIdentifier(fromTable)}"`)}`;
    if (config.join) {
        const { type, table, on } = config.join
        const joinTable = assertSafeIdentifier(table)
        if (type === "CROSS") {
            query = Prisma.sql`${query} CROSS JOIN ${Prisma.raw(`"${quoteIdentifier(joinTable)}"`)}`;
        }
        else {
            if (!on) throw new Error(`on Condition is required for ${type} JOIN`)
            const fromCol = assertSafeIdentifier(on.fromColumn)
            const toCol = assertSafeIdentifier(on.toColumn)
            query = Prisma.sql`${query} ${Prisma.raw(type)} JOIN ${Prisma.raw(`"${quoteIdentifier(joinTable)}"`)} ON ${Prisma.raw(`"${quoteIdentifier(fromTable)}"."${quoteIdentifier(fromCol)}"`)} = ${Prisma.raw(`"${quoteIdentifier(joinTable)}"."${quoteIdentifier(toCol)}"`)}`;
        }
    }
    if (config.where) {
        const col = assertSafeIdentifier(config.where.column)
        const op = config.where.op
        query = Prisma.sql`${query} WHERE ${Prisma.raw(`"${quoteIdentifier(col)}"`)} ${Prisma.raw(op)} ${config.where.value}`
    }
    return query
}


