import {
    Sheet,
    SheetContent,
    SheetTrigger
} from "@/components/ui/sheet";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, ShoppingCart, Package, Users, LineChart, PanelLeft, Search, CircleUser } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";

export default function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs">
                    <nav className="grid gap-6 text-lg font-medium">
                        <Link href="#" className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base">
                            <Package className="h-5 w-5 transition-all group-hover:scale-110" />
                            <span className="sr-only">Gas Gasparzinho</span>
                        </Link>
                        <Link href="/dashboard" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                            <Home className="h-5 w-5" />
                            Dashboard
                        </Link>
                        <Link href="/dashboard/vendas" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                            <ShoppingCart className="h-5 w-5" />
                            Vendas
                        </Link>
                        <Link href="/dashboard/estoque" className="flex items-center gap-4 px-2.5 text-foreground">
                            <Package className="h-5 w-5" />
                            Estoque
                        </Link>
                        <Link href="/dashboard/clientes" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                            <Users className="h-5 w-5" />
                            Clientes
                        </Link>
                        <Link href="/dashboard/relatorios" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                            <LineChart className="h-5 w-5" />
                            Relatorios
                        </Link>
                    </nav>
                </SheetContent>
            </Sheet>
            <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="#">Dashboard</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="relative ml-auto flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar..." className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]" />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                         <CircleUser className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Configuracoes</DropdownMenuItem>
                    <DropdownMenuItem>Suporte</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <LogoutButton />
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
