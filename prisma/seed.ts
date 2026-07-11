import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    await prisma.post.deleteMany()
    await prisma.user.deleteMany()

    const tom = await prisma.user.create({ data: { email: "tom1@gmail.com", name: "tom" } })
    const jerry = await prisma.user.create({ data: { email: "jerry1@gmail.com", name: "jerry" } })

    await prisma.post.create({ data: { title: "Tom post 1", userId: tom.id, publishedAt: true, content: "Tom and jerry" } })
    await prisma.post.create({ data: { title: "Tom post 2", userId: tom.id, content: "Content for tom" } })
    await prisma.post.create({ data: { title: "Jerry post 1", userId: jerry.id, publishedAt: true, content: "Content for jerry" } })

    await prisma.user.create({
        data: {
            email: "doraemon1@test.com",
            name: "Doraemon"
        }
    })
    await prisma.post.create({
        data: {
            title: "Abandoned Post",
            userId: null,
            content:"this is content for abandoned post"
        }
    })

    console.log("Testing data created successfully")
}

main().then(() => console.log("Main function Executed")).catch((e) => { console.log(e); }).finally(async () => { await prisma.$disconnect() })