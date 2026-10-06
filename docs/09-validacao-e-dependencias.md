# 09 — Validação transversal e dependências

## Requisitos de interface para todas as entregas

- Produto e mensagens em português; modificar `app/layout.tsx` para `lang="pt-BR"` e metadata do produto. Datas usam locale `pt-BR` e fuso do navegador; não reinterpretar strings ISO como outro instante.
- Manter tokens visuais existentes de `app/globals.css`, Button, Input, Card e animações. Não é necessário redesenhar login/cadastro ou trocar biblioteca de UI.
- Loading, vazio, erro e sucesso são estados distintos. Empty state não esconde falha de API. Pending bloqueia submissão duplicada; erros mantêm rascunho.
- Labels ligadas aos controles, IDs únicos, mensagens por `aria-describedby`, `aria-invalid`, resumo de erro anunciado e foco no primeiro erro. Textarea/select/checkbox recebem os mesmos cuidados.
- Shell e breadcrumb operáveis por teclado. Diálogo destrutivo com nome acessível, foco contido, Escape/cancelar, foco devolvido ao disparador e botão destrutivo separado.
- Testar viewport de 360 px e desktop, textos grandes, até 100 campos e identificadores de 64 caracteres sem esconder ações. Reordenação e paginação têm alternativa por botão. Respeitar `prefers-reduced-motion` nas novas interações.
- Não mostrar conteúdo de outra conta após logout/login, navegação de volta ou resposta atrasada. Não registrar values, senha, tokens ou corpos privados no console/telemetria.
- Não enviar confirmação de UI, IDs de linha, campos de display ou filtros locais ao backend. Não vender salvamento como concluído em falhas de rede.
- Alertar antes de abandonar rascunho alterado usando navegação controlada da interface e proteção de fechamento/recarga quando suportada; confirmação de exclusão permanece separada.

## Estratégia de testes proposta

Frontend não tem test runner. Na entrega de fundação, adicionar Vitest + Testing Library para validadores, cliente, coordenação de sessão e componentes, e Playwright para jornadas de navegador. Adapter compartilhado precisa teste de integração real com PostgreSQL, não apenas mocks de mutex. Scripts propostos: `test`, `test:integration` e `test:e2e`.

| Grupo | Cenário e resultado exigido | Rastreabilidade |
| --- | --- | --- |
| Contratos | Arrays simples vs RecordPage; datas strings; 204 sem JSON; erro HTML; query somente limit/cursor; 102400 bytes | 02, S-05, R-A05/R-A06 |
| Identidade | Senha 7/8/1025; login mínimo 1; nome Unicode 255/256; cadastro não cria sessão; senha incorreta não desloga | ID-A01 a ID-A08 |
| Sessão | Recarga, acesso direto à action, replay, duas abas, duas instâncias, crash após claim, lease vencido, refresh perdido, logout concorrente | S-01 a S-07 |
| Hierarquia | CRUD completo; vazio vs erro; escopo de identifiers; quota; 404 entre contas; cascatas | SC-01 a SC-08 |
| Schema | Ordem; defaults; limite 100; keys repetidas; PATCH metadata sem fields; conflito rollback; rascunho preservado | T-A01 a T-A08 |
| Valores | Substituição integral; ausente/vazio; required com espaços; Unicode e HTML literal; schema atualizado; key constructor | R-A01 a R-A09 |
| UX | Teclado, foco de erro/diálogo, viewport 360, loading, pending, dados após troca de conta | Requisitos acima |

Jornada mínima E2E: cadastrar → entrar → criar sistema → coleção → template com campos → criar registro → editar um valor preservando outro → recarregar → editar schema compatível → tentar incompatível → excluir registro → excluir template/coleção/sistema → sair. Exercitar cascata com outra árvore ainda contendo registro e testar acesso por segunda conta. Exclusão de conta é cenário separado com confirmação e invalidação de todas as sessões.

Comandos de validação durante implementação, na raiz `generic-roleplay-web`:

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Os três scripts de testes ainda precisam ser criados; estes comandos não são evidência de execução nesta análise. Build integrado precisa das variáveis de ambiente e do ambiente de teste descritos abaixo. O frontend não deve acessar a API em tempo de build para prerenderizar dados privados.

## Dependências de implementação e implantação

| Dependência | Situação atual / requisito |
| --- | --- |
| Contrato do deployment | Actions apontam para URL Vercel fixa; o código local tem mais capacidades. Confirmar versão implantada e disponibilidade dos 26 endpoints; análise não prova paridade remota |
| Ambiente local | API tem porta padrão 3000 e Next normalmente usa 3000. Usar portas distintas, por exemplo API 3001 e web 3000, com API_BASE_URL correspondente |
| Sessão web | O Next não mantém store de sessão. Tokens ficam em cookie HttpOnly cifrado e autenticado, com chave de 32 bytes compartilhada entre instâncias. Trocar a chave invalida os cookies existentes |
| Refresh concorrente | O Nest precisa retornar o mesmo par quando requests concorrentes repetem o refresh token anterior; sem idempotência, a API atual considera replay e revoga a sessão |
| Rate limit atrás do servidor web | Todas as chamadas BFF chegam à API pelo IP do web/proxy, podendo compartilhar 5 logins/15 min e demais quotas. Validar configuração e capacidade antes de liberar; frontend sozinho não resolve esse limite |
| IP original | API usa `TRUSTED_PROXY_CIDRS` explícito. Só encaminhar IP de visitante se derivado de cabeçalho autenticado da borda e houver cadeia de proxies confiável. Não repassar X-Forwarded-For arbitrário do navegador; eventual ajuste de backend/borda é dependência separada |
| CORS | Não há `enableCors` no bootstrap analisado. Arquitetura proposta chama API do servidor Next e não precisa CORS no navegador. Acesso direto browser→API seria mudança de arquitetura e backend |
| Persistência da API | Migrações/tabelas de conteúdo e segurança devem existir. `/health/ready` confere banco e tabelas de segurança, mas não comprova schema de RPG; validar CRUD no ambiente de teste |
| OpenAPI | `/docs` e `/docs-json` são registrados somente em development. Não depender do Swagger público de produção para runtime |
| Payload | API documenta/testa 100 KiB; bodySizeLimit do Next/borda não deve impedir bodies válidos menores. JSON e FormData têm overhead distinto; validar ambos sem aumentar limite da API |
| Replay e rede | API não tem idempotency key para criação. Refresh concorrente/resultado de rotação perdido precisa ser idempotente no Nest; não repetir mutações de conteúdo após resultado desconhecido |
| Edição concorrente | Não há versão/ETag para updates. Avisar recarga de schema, sem prometer prevenção completa de sobrescrita de registros/metadados |

Readiness OPS-01 é sondagem operacional manual/infraestrutural. Não é dashboard de usuário nem polling de cada navegador. Em 200 recebe `{status:"ready"}`; em 503 recebe erro genérico. Não garante que todas as tabelas de conteúdo estejam presentes.

## Funcionalidades que exigem novo backend

GET/PATCH de perfil, alteração/recuperação de senha, confirmação de e-mail, compartilhar/publicar sistemas, busca global, filtros/ordenação no servidor, contagem total de registros, mover entidades entre pais, migração de schema em lote, uploads e campos de tipos não textuais não têm contratos atuais. Se forem desejados, especificar backend antes de incluir controles funcionais na UI.

## Limites e manutenção da documentação

Somente os arquivos deste `docs/` fazem parte da entrega. Foram inspecionados controllers, use cases de identidade, serviços/repositórios de conteúdo, schemas e testes relacionados, além de rotas/actions/componentes do frontend e guias do Next instalado. Não foi feita auditoria de segurança, teste de carga, execução de testes da API ou validação do deployment.

Após mudança na API, revisar primeiro [02](02-contratos-da-api.md), depois a matriz [01](01-inventario-e-lacunas.md) e os critérios do domínio afetado. Mensagens exatas de conflito são fallback enquanto não existir código de erro estável; novas mensagens desconhecidas devem manter tratamento genérico de conflito.

Evidências: [bootstrap](../../generic-roleplay-api/src/main.ts), [configuração HTTP](../../generic-roleplay-api/src/modules/shared/presentation/configure-http-application.ts), [rate limit](../../generic-roleplay-api/src/modules/shared/infrastructure/auth/identity-rate-limit.guard.ts), [readiness](../../generic-roleplay-api/src/modules/shared/presentation/controllers/health.controller.ts), [README operacional da API](../../generic-roleplay-api/README.md), [frontend package.json](../package.json), [Next config](../next.config.ts).
