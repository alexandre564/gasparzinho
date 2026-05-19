'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Home, LineChart, Package, Package2, ShoppingCart, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const navLinks = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/dashboard/vendas', icon: ShoppingCart, label: 'Vendas', badge: '6' },
    { href: '/dashboard/estoque', icon: Package, label: 'Estoque' },
    { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
    { href: '/dashboard/relatorios', icon: LineChart, label: 'Relatórios' },
]

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden border-r bg-muted/40 md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Package2 className="h-6 w-6" />
                        <span className="">Gás Gasparzinho</span>
                    </Link>
                </div>
                <div className="flex-1">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        {navLinks.map(link => (
                             <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                    { "bg-muted text-primary": pathname === link.href }
                                )}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                                {link.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{link.badge}</Badge>}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </div>
    )
}