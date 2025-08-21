import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  console.log("Şirketler:", companies);
}

main()
  .catch((e) => {
    console.error("Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
