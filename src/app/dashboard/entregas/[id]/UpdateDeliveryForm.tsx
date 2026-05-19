'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateDelivery } from '../actions';
import { DeliveryStatus } from "@/types/enums";
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderWithCustomer } from '@/types';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
    );
}

interface UpdateDeliveryFormProps {
    delivery: any;
}

export default function UpdateDeliveryForm({ delivery }: UpdateDeliveryFormProps) {
    const initialState: any = { 
        type: 'error', // Default to error to prevent accidental success messages
        message: ''
    };
    
    const updateDeliveryWithId = updateDelivery.bind(null, delivery);
    const [state, dispatch] = useFormState(updateDeliveryWithId, initialState);

    useEffect(() => {
        if (state.message) {
            if (state.type === 'success') {
                toast.success(state.message);
            } else if (state.type === 'error') {
                toast.error(state.message);
            }
        }
    }, [state]);

    return (
        <form action={dispatch} className="space-y-6">
            <div>
                <Label htmlFor="deliveryStatus">Status da Entrega</Label>
                <Select name="deliveryStatus" defaultValue={(delivery as any).deliveryStatus}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(DeliveryStatus).map((status) => (
                            <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {state.errors?.deliveryStatus && <p className="text-sm text-red-500 mt-1">{state.errors.deliveryStatus.join(', ')}</p>}
            </div>

            <div>
                <Label htmlFor="trackingCode">Código de Rastreio</Label>
                <Input
                    type="text"
                    id="trackingCode"
                    name="trackingCode"
                    defaultValue={(delivery as any).trackingCode || ''}
                    placeholder="ex: BR123456789PT"
                />
                {state.errors?.trackingCode && <p className="text-sm text-red-500 mt-1">{state.errors.trackingCode.join(', ')}</p>}
            </div>

            <div className="pt-4">
                <SubmitButton />
            </div>
        </form>
    );
}
