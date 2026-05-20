// @ts-nocheck

import { signOut } from "@/auth";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Gás Gasparzinho - Dashboard",
    description: "Sistema de gestão para revendedores de gás e água.",
};

function SignOut() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <Button type="submit">Sair</Button>
    </form>
  );
}

export default function DashboardLayout({
    children,
}: Readonly<{ 
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <Header >
                    <div className="relative flex-1 md:grow-0">
                       {/* Search.. */}
                    </div>
                    <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                        <SignOut />
                    </div>
                </Header>
                <main className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
