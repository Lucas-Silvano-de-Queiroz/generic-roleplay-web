import Link from "next/link";
type Breadcrumb = { label: string; href?: string };
export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return <nav aria-label="Navegação estrutural" className="mb-5 text-sm text-muted-foreground"><ol className="flex flex-wrap items-center gap-2">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{item.href ? <Link href={item.href} className="hover:text-foreground">{item.label}</Link> : <span aria-current="page" className="text-foreground">{item.label}</span>}</li>)}</ol></nav>;
}
