import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const schema = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).searchParams.get('schema') ?? undefined
  : undefined;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema });
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
  const passwordAdmin = bcrypt.hashSync('admin123', 10);
  const passwordVendedor = bcrypt.hashSync('senha123', 10);
  const passwordEntregador = bcrypt.hashSync('senha123', 10);

  const users = [
    { name: 'Alexandre Admin', email: 'admin@gasparzinho.com', password: passwordAdmin, role: 'ADMIN' },
    { name: 'Alexandre', email: 'alexandrejo@gmail.com', password: passwordAdmin, role: 'ADMIN' },
    { name: 'Jonaina Maria', email: 'jonaina@gasparzinho.com', password: passwordAdmin, role: 'ADMIN' },
    { name: 'Rodrigo Mendonca', email: 'rodrigo@gasparzinho.com', password: passwordAdmin, role: 'ADMIN' },
    { name: 'Ale Olive', email: 'ale@gasparzinho.com', password: passwordVendedor, role: 'VENDEDOR' },
    { name: 'Alexandre Entregador', email: 'entregador@gasparzinho.com', password: passwordEntregador, role: 'ENTREGADOR' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: true },
      create: user,
    });
  }
}

async function seedDemoData() {
  const maria = await prisma.customer.upsert({
    where: { phone: '35999990001' },
    update: {},
    create: {
      name: 'Maria Aparecida',
      phone: '35999990001',
      street: 'Rua das Flores',
      number: '120',
      neighborhood: 'Centro',
      reference: 'Proximo a padaria',
      cep: '37200000',
      city: 'Lavras',
    },
  });

  const joao = await prisma.customer.upsert({
    where: { phone: '35999990002' },
    update: {},
    create: {
      name: 'Joao Pereira',
      phone: '35999990002',
      street: 'Avenida Brasil',
      number: '45',
      complement: 'Casa',
      neighborhood: 'Jardim Gloria',
      city: 'Lavras',
    },
  });

  const gas13 = await prisma.product.upsert({
    where: { name: 'Gas P13' },
    update: { price: 115, cost: 82, category: 'BOTIJAO', stockKind: 'UNIDADE', inventory: 18 },
    create: { name: 'Gas P13', description: 'Botijao de gas 13kg', price: 115, cost: 82, category: 'BOTIJAO', stockKind: 'UNIDADE', inventory: 18 },
  });

  const agua = await prisma.product.upsert({
    where: { name: 'Agua mineral 20L' },
    update: { price: 18, cost: 9, category: 'AGUA', stockKind: 'UNIDADE', inventory: 32 },
    create: { name: 'Agua mineral 20L', description: 'Galao de agua mineral', price: 18, cost: 9, category: 'AGUA', stockKind: 'UNIDADE', inventory: 32 },
  });

  await prisma.vehicle.upsert({
    where: { placa: 'ABC1D23' },
    update: { modelo: 'Honda CG 160', tipo: 'Moto', status: 'ATIVO', custoMedioKm: 0.65 },
    create: { placa: 'ABC1D23', modelo: 'Honda CG 160', tipo: 'Moto', status: 'ATIVO', custoMedioKm: 0.65, observacoes: 'Veiculo principal de entregas' },
  });

  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    const paidOrder = await prisma.order.create({
      data: {
        customerId: maria.id,
        status: 'ENTREGUE',
        paymentMethod: 'PIX',
        grossValue: 133,
        totalCost: 91,
        netValue: 42,
        items: {
          create: [
            { productId: gas13.id, quantity: 1, unitPrice: 115, total: 115 },
            { productId: agua.id, quantity: 1, unitPrice: 18, total: 18 },
          ],
        },
        delivery: {
          create: { status: 'ENTREGUE', updatedAt: new Date() },
        },
      },
    });

    const debtOrder = await prisma.order.create({
      data: {
        customerId: joao.id,
        status: 'PENDENTE',
        paymentMethod: 'FIADO',
        grossValue: 115,
        totalCost: 82,
        netValue: 33,
        items: {
          create: [{ productId: gas13.id, quantity: 1, unitPrice: 115, total: 115 }],
        },
        delivery: {
          create: { status: 'PENDENTE', updatedAt: new Date() },
        },
      },
    });

    await prisma.debt.create({
      data: {
        customerId: joao.id,
        orderId: debtOrder.id,
        value: 115,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDENTE',
      },
    });

    await prisma.expense.create({
      data: {
        description: 'Combustivel para entregas',
        category: 'Transporte',
        value: 75,
        date: new Date(),
        isRecurring: false,
      },
    });

    console.log(`Pedidos demo criados: ${paidOrder.id}, ${debtOrder.id}`);
  }
}

async function main() {
  await seedUsers();
  await seedDemoData();
  console.log('Seed conclu?do. Usu?rios e dados iniciais dispon?veis.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });