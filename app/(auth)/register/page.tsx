import { Card } from "@/app/components/ui/card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Card>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Junte-se ao Generic Roleplay Web
        </p>
      </div>
      <RegisterForm />
    </Card>
  );
}
