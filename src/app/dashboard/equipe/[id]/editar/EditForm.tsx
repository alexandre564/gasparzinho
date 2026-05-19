'use client';

import { useState } from 'react';
import { updateUser } from '../../actions';
import type { User } from '@/types';
import { toast } from 'sonner';

interface EditFormProps {
  user: any;
}

export function EditForm({ user }: EditFormProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    accessLevel: user.accessLevel,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateUser(user.id, formData);
    if (result?.success) toast.success('Salvo!');
    else toast.error(result?.message || 'Erro');
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label className='block text-sm font-medium'>Nome</label>
        <input name='name' value={formData.name||''} onChange={handleChange} className='mt-1 block w-full border rounded px-3 py-2' />
      </div>
      <div>
        <label className='block text-sm font-medium'>Email</label>
        <input name='email' value={formData.email||''} onChange={handleChange} className='mt-1 block w-full border rounded px-3 py-2' />
      </div>
      <div>
        <label className='block text-sm font-medium'>Nivel de Acesso</label>
        <select name='accessLevel' value={formData.accessLevel||''} onChange={handleChange} className='mt-1 block w-full border rounded px-3 py-2'>
          {["ADMIN","GERENTE","VENDEDOR","OPERADOR"].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <button type='submit' className='bg-blue-600 text-white px-4 py-2 rounded'>Salvar</button>
    </form>
  );
}