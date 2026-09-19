import { PrismaClient } from "@prisma/client";
import { ROOM_TYPES } from "../src/lib/rooms";
import { ensureAdminUser } from "../src/lib/users";

const prisma = new PrismaClient();

async function main() {
  for (const room of ROOM_TYPES) {
    await prisma.roomType.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        name: room.name,
        slug: room.slug,
        description: room.description,
        amenities: JSON.stringify(room.amenities),
        totalUnits: room.totalUnits,
        basePriceInr: room.basePriceInr,
        image: room.image,
      },
      update: {
        name: room.name,
        slug: room.slug,
        description: room.description,
        amenities: JSON.stringify(room.amenities),
        totalUnits: room.totalUnits,
        basePriceInr: room.basePriceInr,
        image: room.image,
      },
    });
  }

  await ensureAdminUser();
  console.log("Room types and admin user ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
