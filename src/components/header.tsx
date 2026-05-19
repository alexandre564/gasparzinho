'use client'

import Link from "next/link"
import { CircleUser, Menu, Package2, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { usePathname } from "next/navigation"

export function Header() {
    const pathname = usePathname();

    const getBreadcrumbs = () => {
        const paths = pathname.split('/').filter(p => p);
        const breadcrumbs = paths.map((path, index) => {
            const href = '/' + paths.slice(0, index + 1).join('/');
            const name = path.charAt(0).toUpperCase() + path.slice(1);
            return { name, href };
        });
        return [{ name: 'Dashboard', href: '/dashboard' }, ...breadcrumbs];
    }

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                     {/* Conteúdo do Sidebar para mobile aqui */}
                </SheetContent>
            </Sheet>
            <div className="w-full flex-1">
                <nav className="hidden md:flex items-center text-sm font-medium">
                    {getBreadcrumbs().map((crumb, index) => (
                        <div key={crumb.href} className="flex items-center">
                        {index > 0 && <span className="mx-2">/</span>}
                        <Link href={crumb.href} className={index === getBreadcrumbs().length -1 ? "text-foreground" : "text-muted-foreground"}>
                            {crumb.name}
                        </Link>
                        </div>
                    ))}
                </nav>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <CircleUser className="h-5 w-5" />
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Configurações</DropdownMenuItem>
                    <DropdownMenuItem>Suporte</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Sair</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}