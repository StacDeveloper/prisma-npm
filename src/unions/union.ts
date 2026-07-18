import { Prisma } from "@prisma/client"
import { assertSafeIdentifier, quotedQualifiedIdentifier } from "../security/security"

interface UnionSubQuery {
    from: string,
    select?: string[]
    where?: {
        column: string
        op: '=' | '!=' | '>' | '<' | '>=' | '<=';
        value: any
    }
}

interface UnionConfig {
    all?: boolean
    queries: UnionSubQuery[]
}

function buildSubQuery(sub: UnionSubQuery): Prisma.Sql {
    const fromTable = assertSafeIdentifier(sub.from)
    const selectTable = (sub.select ?? ['*']).map((c) => (c === '*' ? c : quotedQualifiedIdentifier(c))).join(', ')
    let query = Prisma.sql`SELECT ${Prisma.raw(selectTable)} FROM ${Prisma.raw(`"${fromTable}"`)}`
    if (sub.where) {
        const col = assertSafeIdentifier(sub.where.column)
        const op = sub.where.op
        query = Prisma.sql`${query} WHERE ${Prisma.raw(`"${col}"`)} ${Prisma.raw(op)} ${sub.where.value}`
    }
    return query
}

export function buildUnionQuery(config: UnionConfig): Prisma.Sql {
    if (!config.queries || config.queries.length < 2) {
        throw new Error("Union requires atleast 2 queries")
    }
    const unionKeyWord = config.all ? "UNION ALL" : "UNION"
    const subQuery = config.queries.map(buildSubQuery)
    let result = subQuery[0]
    for (let i = 1; i < subQuery.length; i++) {
        result = Prisma.sql`${result} ${Prisma.raw(unionKeyWord)} ${subQuery[i]}`
    }
    return result
}