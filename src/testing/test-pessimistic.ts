import { PrismaClient } from "@prisma/client"
import { withToolKit } from ".."

const base = new PrismaClient()
const prisma = withToolKit(base)

function sleep(ms: number) {
    return new Promise((res, rej) => setTimeout(() => res, ms))
}

async function main() {
    const user = await prisma.user.findFirst({ where: { email: "tom1@gmail.com" } })
    if (!user) throw new Error("Email Id not found for user")
    const log = (label: string) => console.log(`[${new Date().toISOString()}] ${label}`)
    const txa = prisma.$lock.pessimistic({ table: "User", id: user.id, mode: "FOR UPDATE" }, async (tx, row) => {
        log("TX A: acquired lock")
        await sleep(3000)
        log("TX A: releasing lock (transaction committing)")
        return row
    })

    const txb = (async () => {
        await sleep(200)
        log('TX B: attempting to acquire lock (should block here)');
        return prisma.$lock.pessimistic(
            { table: "User", id: user.id, mode: "FOR UPDATE" },
            async function (tx, row) {
                log("TX B: acquired lock (A must have released it)")
                return row
            }
        )
    })()
    await Promise.all([txa, txb])
    log("Both transactions complete")


}
main().then((res) => console.table(res)).catch((err) => console.error(err)).finally(() => base.$disconnect())