import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

export const { handlers, auth, signIn, signOut } = NextAuth({
    pages: {
        signIn: '/login',
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await prisma.user.findUnique({ where: { email } });

                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return user;
                }

                return null;
            },
        }),
    ],
    callbacks: {
        // Adiciona o ID do usuário e o role ao token JWT
        async jwt({ token, user }) {
            if (user) { // Na primeira vez que o usuário loga
                token.id = user.id;
                token.role = (user as User).role; // Casting para o tipo User do Prisma
            }
            return token;
        },
        // Disponibiliza o ID e o role na sessão do cliente
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    session: { strategy: 'jwt' }, // Usar JWT para gerenciamento de sessão
    secret: process.env.AUTH_SECRET, // Variável de ambiente para o secret
});
