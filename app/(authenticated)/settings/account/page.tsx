import { Card } from "@/app/components/ui/card";
import { DeleteAccountForm } from "@/app/(authenticated)/settings/account/delete-account-form";

export default function AccountSettingsPage() {
  return <div className="space-y-6">
    <div><p className="text-sm text-muted-foreground">Configurações</p><h1 className="mt-1 text-3xl font-medium">Conta</h1></div>
    <Card className="max-w-none p-6 sm:p-8"><h2 className="text-lg font-medium">Zona de exclusão</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Excluir sua conta remove todos os seus sistemas, coleções, templates e registros. Esta ação não pode ser desfeita.</p><DeleteAccountForm /></Card>
  </div>;
}
