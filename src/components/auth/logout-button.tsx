'use client';

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { doSignOut } from "@/app/dashboard/actions";

export function LogoutButton() {
  return (
    <DropdownMenuItem asChild>
        <form action={doSignOut} className="w-full">
            <button type="submit" className="w-full text-left">
                Sair
            </button>
        </form>
    </DropdownMenuItem>
  );
}
