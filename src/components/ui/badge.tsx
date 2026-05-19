import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { DeliveryStatus, OrderStatus } from '@prisma/client'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Order Statuses
        PENDENTE: "border-transparent bg-yellow-500 text-white",
        PROCESSANDO: "border-transparent bg-blue-500 text-white",
        ENVIADO: "border-transparent bg-blue-700 text-white",
        ENTREGUE: "border-transparent bg-green-600 text-white",
        CANCELADO: "border-transparent bg-red-600 text-white",
        // Delivery Statuses
        EM_TRANSITO: "border-transparent bg-cyan-500 text-white",
        FALHA_NA_ENTREGA: "border-transparent bg-orange-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
      variant: VariantProps<typeof badgeVariants>["variant"] | OrderStatus | DeliveryStatus
    }

function Badge({ className, variant, ...props }: BadgeProps) {
  // @ts-ignore - We are confident that the variant will be a valid key
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
