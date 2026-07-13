import { describe, it, expect } from "vitest"
import { assertSafeIdentifier, assertSafeQualifiedIdentifier, quoteIdentifier } from "../security/security"

describe("assertSafeIdentifier", () => {
    it("accepts valid plain identifier", () => {
        expect(assertSafeIdentifier("User")).toBe("User");
        expect(assertSafeIdentifier("user_id")).toBe("user_id")
        expect(assertSafeIdentifier("_private")).toBe("_private")
    })

    it("rejects identifier with special character", () => {
        expect(() => assertSafeIdentifier("User; DROP TABLE users;--")).toThrow()
        expect(() => assertSafeIdentifier("User' OR '1'='1")).toThrow()
        expect(() => assertSafeIdentifier("User Table")).toThrow()
        expect(() => assertSafeIdentifier("User.email")).toThrow()
    })

    it("rejects identifier starting with a digit", () => {
        expect(() => assertSafeIdentifier("1User")).toThrow()
    })
    it("rejects empty string", () => {
        expect(() => assertSafeIdentifier("")).toThrow()
    })
})

describe("assertSafeQualifiedIdentifier", () => {
    it("accepts plain identifier", () => {
        expect(assertSafeQualifiedIdentifier("email")).toBe("email")
    })
    it("accepts table.column form", () => {
        expect(assertSafeQualifiedIdentifier("User.email")).toBe("User.email")
    })
    it('accepts aliasing with "as"', () => {
        expect(assertSafeQualifiedIdentifier("Post.id as postId")).toBe("Post.id as postId")
    })
    it("rejects injection attempts disguised as aliases", () => {
        expect(() => assertSafeQualifiedIdentifier("email as x; DROP TABLE users;--")).toThrow()
    })
    it("rejects more than one dot", () => {
        expect(() => assertSafeQualifiedIdentifier("a.b.c")).toThrow()
    })
})

describe("quoteIdentifier", () => {
    it("wraps identifier in double quotes", () => {
        expect(quoteIdentifier("User")).toBe('"User"')
    })
})