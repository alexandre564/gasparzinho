import Header from "@/components/AppHeader";
import Sidebar from "@/components/AppSidebar";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Gasparzinho",
  description: "Sistema de gestão para revendedores de gás e água.",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Sidebar />
      <div className="min-h-screen min-w-0 lg:pl-64">
        <Header />
        <main className="mx-auto w-full min-w-0 max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
