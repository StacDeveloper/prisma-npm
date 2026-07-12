import { PrismaClient } from "@prisma/client"
import { withToolKit } from ".."

const base = new PrismaClient()
const prisma = withToolKit(base)

async function main() {
    const user = await prisma.user.findFirst({ where: { email: "tom1@gmail.com" } })
    if (!user) throw new Error("emailId not found")
    console.log("current version ", user.version)

    const success = await prisma.$lock.optimistic({
        model: "user",
        id: user.id,
        expectedVersion: user.version,
        data: { name: "Updated Tom" }
    })
    console.log("Updated with new version successded ", success)

    try {
        const test2 = await prisma.$lock.optimistic({
            model: "user",
            id: user.id,
            expectedVersion: user.version,
            data: { name: "This should not apply" }
        })
        if (!test2) console.log('ERROR: stale update should NOT have succeeded');
        console.log("this is new version", test2)
    } catch (error: any) {
        console.log('Correctly rejected stale update:', error.message);
    }
}
main().then((res) => console.table(res)).catch((err) => console.error(err)).finally(() => base.$disconnect())