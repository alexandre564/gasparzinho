import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = bcrypt.hashSync('admin123', 10);
  const passwordVendedor = bcrypt.hashSync('senha123', 10);
  const passwordEntregador = bcrypt.hashSync('senha123', 10);

  const users = [
    {
      name: 'Alexandre Admin',
      email: 'admin@gasparzinho.com',
      password: passwordAdmin,
      role: 'ADMIN',
    },
    {
      name: 'Alexandre',
      email: 'alexandrejo@gmail.com',
      password: passwordAdmin,
      role: 'ADMIN',
    },
    {
      name: 'Jonaina Maria',
      email: 'jonaina@gasparzinho.com',
      password: passwordAdmin,
      role: 'ADMIN',
    },
    {
      name: 'Rodrigo Mendonca',
      email: 'rodrigo@gasparzinho.com',
      password: passwordAdmin,
      role: 'ADMIN',
    },
    {
      name: 'Ale Olive',
      email: 'ale@gasparzinho.com',
      password: passwordVendedor,
      role: 'VENDEDOR',
    },
    {
      name: 'Alexandre Entregador',
      email: 'entregador@gasparzinho.com',
      password: passwordEntregador,
      role: 'ENTREGADOR',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: user,
    });
  }

  console.log('Seed concluido. Usuarios iniciais disponiveis.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
