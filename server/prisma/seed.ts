import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.service.upsert({
    where: { id: "haircut" },
    update: {},
    create: { id: "haircut", label: "Haircut", durationMin: 45, priceCents: 3500 },
  });

  await prisma.service.upsert({
    where: { id: "beard-trim" },
    update: {},
    create: { id: "beard-trim", label: "Beard Trim", durationMin: 20, priceCents: 1500 },
  });

  await prisma.service.upsert({
    where: { id: "haircut-beard" },
    update: {},
    create: { id: "haircut-beard", label: "Haircut + Beard Trim", durationMin: 60, priceCents: 4500 },
  });

  console.log("Seeded services ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
