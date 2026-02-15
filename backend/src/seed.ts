import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { Role } from '@prisma/client';

async function main() {
  const email = 'admin@local';
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;

  const password = await bcrypt.hash('Admin123!', 10);
  await prisma.user.create({
    data: {
      email,
      name: 'Admin',
      role: Role.admin,
      password,
    },
  });

  console.log('Seeded admin:', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
