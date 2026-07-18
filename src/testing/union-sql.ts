import { PrismaClient } from "@prisma/client";
import { buildUnionQuery } from "../unions/union";
import { withToolKit } from "..";

const base = new PrismaClient();
const prisma = withToolKit(base)


async function main() {
    const unionResult: any = await prisma.$union({
        all: false,
        queries: [
            { from: "User", select: ["email as label"], where: { column: "name", op: "=", value: "tom" } },
            { from: "Post", select: ["title as label"] },
        ],
    });
    console.log("--- UNION (deduped) ---");
    console.table(unionResult)

    // UNION ALL (keeps duplicates, faster since no dedupe pass)
    const unionAllResult: any = await prisma.$union({
        all: true,
        queries: [
            { from: "User", select: ["email as label"] },
            { from: "Post", select: ["title as label"] },
        ],
    });
    console.log("--- UNION ALL (with duplicates) ---");
    console.table(unionAllResult);
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());