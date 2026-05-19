
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = bcrypt.hashSync('admin123', 10);
  const passwordVendedor = bcrypt.hashSync('senha123', 10);
  const passwordEntregador = bcrypt.hashSync('senha123', 10);

  // Limpa a tabela de usuários antes de popular
  await prisma.user.deleteMany({});

  // Cria os usuários
  await prisma.user.createMany({
    data: [
      { 
        name: 'Alexandre Admin', 
        email: 'admin@gasparzinho.com', 
        password: passwordAdmin, 
        role: 'ADMIN' 
      },
      { 
        name: 'Jonaina Maria', 
        email: 'jonaina@gasparzinho.com', 
        password: passwordAdmin, 
        role: 'ADMIN' 
      },
      { 
        name: 'Rodrigo Mendonça', 
        email: 'rodrigo@gasparzinho.com', 
        password: passwordAdmin, 
        role: 'ADMIN' 
      },
      { 
        name: 'Ale Olive', 
        email: 'ale@gasparzinho.com', 
        password: passwordVendedor, 
        role: 'VENDEDOR' 
      },
      { 
        name: 'Alexandre Entregador', 
        email: 'entregador@gasparzinho.com', 
        password: passwordEntregador, 
        role: 'ENTREGADOR' 
      }
    ],
  });

  console.log('Seed concluído. Usuários criados com sucesso.');
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
