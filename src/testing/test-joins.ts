import { PrismaClient } from "@prisma/client";
import { withToolKit } from "../index.js";

const base = new PrismaClient()
const prisma = withToolKit(base)

async function main() {
    const data: any = {
        from: "User",
        select: ["title", "content"],
        join: {
            type: "CROSS",
            table: "Post",
            on: { fromColumn: "id", toColumn: "userId" }
        }
    }

    const result = await prisma.$join(data)
    return result
}

main().then((res) => console.table(res)).catch((err) => console.error(err)).finally(() => base.$disconnect())