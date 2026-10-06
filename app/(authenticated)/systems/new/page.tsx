import Link from "next/link";
import { createSystemAction } from "@/app/actions/systems";
import { Breadcrumbs } from "@/app/components/content/breadcrumbs";
import { EntityForm } from "@/app/components/content/entity-form";

export default function NewSystemPage() {
  return <><Breadcrumbs items={[{ label: "Sistemas", href: "/systems" }, { label: "Novo sistema" }]} /><h1 className="mb-6 text-3xl font-medium">Criar sistema</h1><EntityForm action={createSystemAction} mode="create" kind="system"/><Link href="/systems" className="mt-6 inline-block text-sm text-muted-foreground hover:text-foreground">Cancelar</Link></>;
}
