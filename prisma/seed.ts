import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const schema = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).searchParams.get('schema') ?? undefined
  : undefined;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema });
const prisma = new PrismaClient({ adapter });

const DEFAULT_ORGANIZATION_ID = 'org_gas_default';
const DEFAULT_BRANCH_ID = 'branch_gasparzinho_default';

async function seedBranch() {
  await prisma.organization.upsert({
    where: { id: DEFAULT_ORGANIZATION_ID },
    update: {
      name: 'Gas',
      status: 'ATIVA',
    },
    create: {
      id: DEFAULT_ORGANIZATION_ID,
      name: 'Gas',
      status: 'ATIVA',
      notes: 'Organizacao principal para gestao das filiais Gas.',
    },
  });

  await prisma.branch.upsert({
    where: { id: DEFAULT_BRANCH_ID },
    update: {
      name: 'Gas Gasparzinho',
      tradingName: 'Gasparzinho',
      city: 'Lavras',
      status: 'ATIVA',
      contractStatus: 'PROPRIA',
    },
    create: {
      id: DEFAULT_BRANCH_ID,
      organizationId: DEFAULT_ORGANIZATION_ID,
      name: 'Gas Gasparzinho',
      tradingName: 'Gasparzinho',
      city: 'Lavras',
      status: 'ATIVA',
      contractStatus: 'PROPRIA',
      notes: 'Filial base do projeto Gasparzinho.',
    },
  });
}

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
      update: {
        name: user.name,
        role: user.role,
        organizationId: DEFAULT_ORGANIZATION_ID,
        branchId: DEFAULT_BRANCH_ID,
        isActive: true,
      },
      create: {
        ...user,
        organizationId: DEFAULT_ORGANIZATION_ID,
        branchId: DEFAULT_BRANCH_ID,
      },
    });
  }
}

async function seedDemoData() {
  await prisma.systemSetting.upsert({
    where: { key: 'defaultBranchName' },
    update: { value: 'Gas Gasparzinho' },
    create: { key: 'defaultBranchName', value: 'Gas Gasparzinho' },
  });

  const maria = await prisma.customer.upsert({
    where: { branchId_phone: { branchId: DEFAULT_BRANCH_ID, phone: '35999990001' } },
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
      branchId: DEFAULT_BRANCH_ID,
    },
  });

  const joao = await prisma.customer.upsert({
    where: { branchId_phone: { branchId: DEFAULT_BRANCH_ID, phone: '35999990002' } },
    update: {},
    create: {
      name: 'Joao Pereira',
      phone: '35999990002',
      street: 'Avenida Brasil',
      number: '45',
      complement: 'Casa',
      neighborhood: 'Jardim Gloria',
      city: 'Lavras',
      branchId: DEFAULT_BRANCH_ID,
    },
  });

  const gas13Data = {
    name: 'Gas P13',
    description: 'Botijao de gas 13kg',
    price: 115,
    cost: 82,
    category: 'BOTIJAO',
    stockKind: 'UNIDADE',
    inventory: 18,
  };
  const gas13Existing = await prisma.product.findFirst({
    where: {
      branchId: DEFAULT_BRANCH_ID,
      name: { contains: 'P13' },
    },
  });
  const gas13UpdateData = {
    description: gas13Data.description,
    price: gas13Data.price,
    cost: gas13Data.cost,
    category: gas13Data.category,
    stockKind: gas13Data.stockKind,
    inventory: gas13Data.inventory,
  };
  const gas13 = gas13Existing
    ? await prisma.product.update({ where: { id: gas13Existing.id }, data: gas13UpdateData })
    : await prisma.product.create({ data: { ...gas13Data, branchId: DEFAULT_BRANCH_ID } });

  const aguaData = {
    name: 'Agua mineral 20L',
    description: 'Galao de agua mineral',
    price: 18,
    cost: 9,
    category: 'AGUA',
    stockKind: 'UNIDADE',
    inventory: 32,
  };
  const agua = await prisma.product.upsert({
    where: { branchId_name: { branchId: DEFAULT_BRANCH_ID, name: aguaData.name } },
    update: aguaData,
    create: { ...aguaData, branchId: DEFAULT_BRANCH_ID },
  });

  await prisma.vehicle.upsert({
    where: { branchId_placa: { branchId: DEFAULT_BRANCH_ID, placa: 'ABC1D23' } },
    update: { modelo: 'Honda CG 160', tipo: 'Moto', status: 'ATIVO', custoMedioKm: 0.65 },
    create: {
      placa: 'ABC1D23',
      modelo: 'Honda CG 160',
      tipo: 'Moto',
      status: 'ATIVO',
      custoMedioKm: 0.65,
      observacoes: 'Veiculo principal de entregas',
      branchId: DEFAULT_BRANCH_ID,
    },
  });

  const existingOrders = await prisma.order.count({ where: { branchId: DEFAULT_BRANCH_ID } });
  if (existingOrders === 0) {
    const mariaAddress = `${maria.street}, ${maria.number} - ${maria.neighborhood} - ${maria.city} - CEP ${maria.cep}`;
    const joaoAddress = `${joao.street}, ${joao.number} - ${joao.complement} - ${joao.neighborhood} - ${joao.city}`;
    const paidOrder = await prisma.order.create({
      data: {
        customerId: maria.id,
        status: 'ENTREGUE',
        paymentMethod: 'PIX',
        deliveryAddress: mariaAddress,
        deliveryReference: maria.reference,
        grossValue: 133,
        totalCost: 91,
        netValue: 42,
        branchId: DEFAULT_BRANCH_ID,
        items: {
          create: [
            { productId: gas13.id, quantity: 1, unitPrice: 115, total: 115 },
            { productId: agua.id, quantity: 1, unitPrice: 18, total: 18 },
          ],
        },
        delivery: {
          create: { status: 'ENTREGUE', updatedAt: new Date(), branchId: DEFAULT_BRANCH_ID },
        },
      },
    });

    const debtOrder = await prisma.order.create({
      data: {
        customerId: joao.id,
        status: 'PENDENTE',
        paymentMethod: 'FIADO',
        deliveryAddress: joaoAddress,
        deliveryReference: joao.reference,
        grossValue: 115,
        totalCost: 82,
        netValue: 33,
        branchId: DEFAULT_BRANCH_ID,
        items: {
          create: [{ productId: gas13.id, quantity: 1, unitPrice: 115, total: 115 }],
        },
        delivery: {
          create: { status: 'PENDENTE', updatedAt: new Date(), branchId: DEFAULT_BRANCH_ID },
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
        branchId: DEFAULT_BRANCH_ID,
      },
    });

    await prisma.expense.create({
      data: {
        description: 'Combustivel para entregas',
        category: 'Transporte',
        value: 75,
        date: new Date(),
        isRecurring: false,
        branchId: DEFAULT_BRANCH_ID,
      },
    });

    console.log(`Pedidos demo criados: ${paidOrder.id}, ${debtOrder.id}`);
  }
}

async function main() {
  await seedBranch();
  await seedUsers();
  await seedDemoData();
  console.log('Seed concluido. Usuarios e dados iniciais disponiveis.');
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
