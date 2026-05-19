import { getMonthlySalesData } from "./actions";
import { SalesChart } from "./SalesChart";

export default async function RelatoriosPage() {
    const salesData = await getMonthlySalesData();

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">Relatórios de Vendas</h1>
            <div className="grid grid-cols-1 gap-8">
                 <SalesChart data={salesData} />
            </div>
        </div>
    );
}
