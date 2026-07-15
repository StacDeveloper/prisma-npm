import { PrismaClient } from "@prisma/client";
import { buildJoinQuery } from "../joins/JoinBuilder";

const prisma = new PrismaClient();

async function main() {
  const sql = buildJoinQuery({
    from: "User",
    select: ["User.email", "Post.title"],
    join: {
      type: "LEFT",
      table: "Post",
      on: { fromColumn: "id", toColumn: "userId" },
    },
  });

  console.log("Generated SQL text:", sql.sql);
  console.log("Params:", sql.values);

  const result = await prisma.$queryRaw(sql);
  console.table(result);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());