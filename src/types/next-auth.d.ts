
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extending the User type to include the 'role' property.
   */
  interface User extends DefaultUser {
    role: string;
    organizationId?: string | null;
    branchId?: string | null;
  }

  /**
   * Extending the Session type to include the 'role' property.
   */
  interface Session extends DefaultSession {
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string; // Add role to the session user
      organizationId?: string | null;
      branchId?: string | null;
    } | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extending the JWT type to include the 'role' property.
   */
  interface JWT {
    role?: string;
    organizationId?: string | null;
    branchId?: string | null;
  }
}
