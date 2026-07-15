const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_IDENTIFIER_LENGTH = 63

function validateSegment(segment: string): void {
    if (segment.length === 0) {
        throw new Error("Identifier segment cannot be empty")
    }
    if (segment.length > MAX_IDENTIFIER_LENGTH) {
        throw new Error(`Identifier ${segment} exceeds ${MAX_IDENTIFIER_LENGTH} character limit(Postgres will silently truncate it)`)
    }
    if (!IDENT_RE.test(segment)) {
        throw new Error(`Unsafe or invalid identifier: ${segment}`)
    }
}

export function assertSafeIdentifier(name: string): string {
    validateSegment(name)
    return name
}

export function assertSafeQualifiedIdentifier(name: string): string {
    const [core, ...rest] = name.split(/\s+as\s+/i)
    if (rest.length > 1) {
        throw new Error(`Invalid identifier expression: ${name}`)
    }
    const segment = core.trim().split(".")
    if (segment.length > 2) {
        throw new Error(`Invalid identifier expression: ${name}`)
    }
    segment.forEach(validateSegment)

    if (rest.length === 1) {
        validateSegment(rest[0].trim())
    }
    return name
}

export function quoteIdentifier(name: string): string {
    return `"${name}"`
}

export function quotedQualifiedIdentifier(name: string): string {
    assertSafeQualifiedIdentifier(name)
    const [core, alias] = name.split(/\s+as\s+/i)
    const segment = core.trim().split(".")
    const quotedCore = segment.map((seg) => quoteIdentifier(seg)).join(".")
    return alias ? `${quotedCore} as ${quoteIdentifier(alias.trim())}` : quotedCore
}

