import Header from "@/components/AppHeader";
import Sidebar from "@/components/AppSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gás Gasparzinho - Dashboard",
  description: "Sistema de gestão para revendedores de Gás e água.",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Header />
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}