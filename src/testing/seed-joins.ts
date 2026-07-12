import { Prisma, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()


async function runJoin(label: string, sql: Prisma.Sql) {
    const rows = await prisma.$queryRaw(sql)
    console.log(`\n--- ${label} (${(rows as any[]).length} rows) ---`)
    console.table(rows)
}

async function main() {
    await runJoin("INNER JOIN (expect 3)", Prisma.sql`SELECT u.email, p.title FROM "User" u INNER JOIN "Post" p ON p."userId" = u.id`)
    await runJoin("LEFT JOIN (expect 4, + TOM)", Prisma.sql`SELECT u.email, p.title FROM "User" u LEFT JOIN "Post" p ON p."userId" = u.id`)
    await runJoin("RIGHT JOIN (expect 4 + Abandoned Post)", Prisma.sql`SELECT u.email,p.title FROM "User" u RIGHT JOIN "Post" p ON p."userId" = u.id`)
    await runJoin("FULL OUTER JOIN (expect 5", Prisma.sql`SELECT u.email, p.title FROM "User" u FULL OUTER JOIN "Post" p ON p."userId" = u.id`);
    await runJoin("CROS JOIN (expect 4 users * 4 posts = 16", Prisma.sql`SELECT u.email, p.title FROM "User" u CROSS JOIN "Post" p`)
}

main().then(() => console.log("Main function exexuted")).catch((err) => console.log(err)).finally(() => prisma.$disconnect())

