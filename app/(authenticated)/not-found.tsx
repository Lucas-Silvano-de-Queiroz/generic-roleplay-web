import Link from "next/link";
import { Button } from "@/app/components/ui/button";
export default function AuthenticatedNotFound() {
  return <section className="mx-auto max-w-lg py-16 text-center"><h1 className="text-2xl font-medium">Recurso não encontrado.</h1><p className="mt-2 text-sm text-muted-foreground">O recurso não existe ou não está disponível para esta conta.</p><Button asChild className="mt-5"><Link href="/systems">Voltar para sistemas</Link></Button></section>;
}
