'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateUserFromForm } from '../../actions';
import { TEAM_ROLES } from '../../roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User } from '@/types';

interface EditFormProps {
  user: User;
}

export function EditForm({ user }: EditFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role || user.accessLevel || 'VENDEDOR',
    isActive: user.isActive,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'isActive' ? value === 'true' : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = new FormData();
    payload.set('name', formData.name);
    payload.set('email', formData.email);
    payload.set('role', formData.role);
    payload.set('isActive', String(formData.isActive));
    payload.set('password', formData.password);

    const result = await updateUserFromForm(user.id, payload);
    setIsSaving(false);

    if (result?.success) {
      toast.success(result.message);
      router.push('/dashboard/equipe');
      router.refresh();
      return;
    }

    toast.error(result?.message || 'Nao foi possivel salvar.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-bold text-slate-800">Nome</label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-bold text-slate-800">Email de login</label>
        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
        <p className="text-xs font-medium text-slate-500">Este email sera usado para entrar no sistema.</p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-bold text-slate-800">Nova senha</label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          minLength={6}
          autoComplete="new-password"
          placeholder="Deixe em branco para manter a senha atual"
        />
        <p className="text-xs font-medium text-slate-500">
          Preencha apenas quando quiser alterar a senha deste membro. A nova senha passa a valer no proximo login.
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="role" className="text-sm font-bold text-slate-800">Nivel de acesso</label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        >
          {TEAM_ROLES.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="isActive" className="text-sm font-bold text-slate-800">Situacao</label>
        <select
          id="isActive"
          name="isActive"
          value={String(formData.isActive)}
          onChange={handleChange}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        >
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-5">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/equipe')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
        </Button>
      </div>
    </form>
  );
}
