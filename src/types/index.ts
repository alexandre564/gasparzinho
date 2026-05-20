import { Prisma } from '@prisma/client';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  accessLevel: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderWithCustomer = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: { customer: true },
});

export type OrderWithCustomer = Prisma.OrderGetPayload<typeof orderWithCustomer>;
export type FullOrder = OrderWithCustomer;