import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildUnionQuery } from '../unions/union';

const prisma = new PrismaClient();

beforeAll(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({ data: { email: 'a@test.com', name: 'A' } });
    await prisma.user.create({ data: { email: 'b@test.com', name: 'B' } });

    await prisma.post.create({ data: { title: 'a@test.com', content: "timepass" } }); 
    await prisma.post.create({ data: { title: 'Unique Post', content: "timepass2" } });
});

afterAll(async () => {
    await prisma.$disconnect();
});

async function run(sql: ReturnType<typeof buildUnionQuery>) {
    return prisma.$queryRaw(sql);
}

describe('buildUnionQuery', () => {
    it('UNION dedupes identical rows across sub-queries', async () => {
        const sql = buildUnionQuery({
            all: false,
            queries: [
                { from: 'User', select: ['email as label'] },
                { from: 'Post', select: ['title as label'] },
            ],
        });
        const rows = await run(sql);

        expect(rows).toHaveLength(3);
    });

    it('UNION ALL keeps all rows including duplicates', async () => {
        const sql = buildUnionQuery({
            all: true,
            queries: [
                { from: 'User', select: ['email as label'] },
                { from: 'Post', select: ['title as label'] },
            ],
        });
        const rows = await run(sql);
        expect(rows).toHaveLength(4);
    });

    it('applies WHERE filters per sub-query independently', async () => {
        const sql = buildUnionQuery({
            all: true,
            queries: [
                { from: 'User', select: ['email as label'], where: { column: 'name', op: '=', value: 'A' } },
                { from: 'Post', select: ['title as label'], where: { column: 'title', op: '=', value: 'Unique Post' } },
            ],
        });
        const rows = await run(sql);
        expect(rows).toHaveLength(2);
        expect(Array.isArray(rows) && rows.map((r) => r.label).sort()).toEqual(['Unique Post', 'a@test.com']);
    });

    it('throws when fewer than 2 queries are given', () => {
        expect(() =>
            buildUnionQuery({ queries: [{ from: 'User', select: ['email'] }] })
        ).toThrow(/Union requires atleast 2 queries/i);
    });

    it('rejects unsafe identifiers in sub-queries', () => {
        expect(() =>
            buildUnionQuery({
                queries: [
                    { from: 'User; DROP TABLE users;--', select: ['email'] },
                    { from: 'Post', select: ['title'] },
                ],
            })
        ).toThrow();
    });
});