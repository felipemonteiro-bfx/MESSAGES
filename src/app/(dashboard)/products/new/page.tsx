import { WarrantyForm } from '@/components/warranties/WarrantyForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Garantia</h1>
        <p className="text-secondary">Cadastre os detalhes do produto e o comprovante de compra.</p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <WarrantyForm />
        </CardContent>
      </Card>
    </div>
  );
}
