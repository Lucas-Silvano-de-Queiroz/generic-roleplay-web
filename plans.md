# Integração completa do frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** implementar no web os fluxos de conta e conteúdo privado disponíveis na API, com sessão persistente, formulários e navegação utilizáveis.

**Architecture:** Next App Router com leituras em Server Components, mutações em Server Actions e formulários em Client Components. O Next encaminha cookies de auth HttpOnly à API Nest; o browser guarda apenas a cópia cifrada `HttpOnly` da sessão web. `proxy.ts` renova tokens antes da expiração sem banco de sessões no Next.

**Tech Stack:** Next 16.3.0, React 19.2.8, TypeScript, Tailwind 4 e pnpm existentes. Dependência de runtime: `server-only`; Vitest, jsdom, Testing Library e Playwright para validação. Cifragem com `node:crypto`.

**Spec:** [índice](docs/README.md), [inventário](docs/01-inventario-e-lacunas.md), [contratos](docs/02-contratos-da-api.md), [sessão](docs/03-integracao-e-sessao.md), [identidade](docs/04-identidade.md), [sistemas/coleções](docs/05-sistemas-e-colecoes.md), [templates](docs/06-templates.md), [registros](docs/07-registros.md), [sequência original](docs/08-plano-de-implementacao.md) e [validação/dependências](docs/09-validacao-e-dependencias.md).

**Status:** implementação do frontend executada em 05/10/2026: contratos/validação, sessão web em cookie cifrado, identidade, shell, hierarquia de conteúdo, templates, registros e runtime documentado. O Next não mantém banco próprio de sessões. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm exec next build --webpack` e `git diff --check` passaram; nenhum teste foi executado. O frontend pressupõe que o Nest retorne o mesmo par ao receber refresh concorrente com o token anterior; o responsável pelo Nest está implementando essa idempotência. Todos os caminhos abaixo são relativos a `generic-roleplay-web/`.

## Global Constraints

- Produto e mensagens em português; `lang="pt-BR"`; datas com locale `pt-BR` e fuso do navegador.
- Preservar os tokens visuais de `app/globals.css`, componentes Button/Input/Card e animações existentes; respeitar `prefers-reduced-motion`.
- Ler os guias instalados em `node_modules/next/dist/docs/` conforme `AGENTS.md` antes de escrever código Next. Usar `await cookies()`, `await params` e `await searchParams`.
- `API_BASE_URL` e `WEB_SESSION_COOKIE_ENCRYPTION_KEY` são exclusivas do servidor. Runtime Node para cliente, cifragem e Proxy. HTTP apenas em desenvolvimento local; HTTPS nos demais ambientes.
- Tokens nunca ficam em localStorage/sessionStorage, props, URL, HTML ou retorno de action. O navegador armazena apenas o cookie HttpOnly cifrado; não registrar senha, tokens, values ou corpos privados.
- Cookie de produção `__Host-grp-session`: HttpOnly, Secure, SameSite=Lax, Path=/, sem Domain. Desenvolvimento HTTP: `grp-session`, sem Secure. Conteúdo é o par de tokens cifrado por AES-256-GCM com chave Base64 de 32 bytes; limite local do valor cifrado: 3800 bytes.
- Access token: quinze minutos; sessão absoluta: no máximo quinze dias desde o login, sem extensão por refresh. Timeout HTTP 10000 ms; margem de refresh 120000 ms. O Nest garante resposta idempotente para refresh concorrente.
- JSON até 100 KiB (102400 bytes), medido no servidor por `Buffer.byteLength(JSON.stringify(body), "utf8")`. Nunca truncar texto ou senha para caber.
- Cadastro/exclusão: senha 8–1024 unidades UTF-16; login: 1–1024. Nome da conta: entrada bruta até 1024 UTF-16, depois trim e 1–255 pontos de código. E-mail: entrada até 512, trim/lowercase, até 255 normalizado.
- Conteúdo: name/label até 100 UTF-16 brutas, depois trim e mínimo 1; description de entidade até 5000, de campo até 1000; category até 64; identifier/key 1–64, regex `^[a-z][a-z0-9_-]*$`.
- Até 100 coleções/sistema, 100 templates/coleção, 100 campos/template e 1000 registros/template. Não impor quota de sistemas inexistente no contrato.
- `maxLength`: inteiro 1–100000; `required` padrão false; `format` padrão text, enum text/textarea. Array vazio de campos é válido.
- `fields` enviado em PATCH substitui o array inteiro; `values` enviado substitui o objeto inteiro. Omissão preserva. Textos apagados de entidade usam `""`; `null` é inválido; PATCH igual preserva updatedAt.
- Values são strings literais, sem trim/conversão no envio; required usa presença própria e trim somente para validar. Limites textuais usam `.length` UTF-16. Valores ficam literais e HTML é escapado.
- API com `cache: "no-store"`; 204 sem parse JSON; sucesso JSON precisa de decoder. Sem repetição automática de POST/PATCH/DELETE após resultado desconhecido.
- Cada loader/action/handler privado verifica sessão. UUID inválido não gera fetch. IDs dos ancestrais vêm dos DTOs autorizados; campos ocultos não comprovam ownership.
- Não adicionar GET/PATCH de perfil, recuperação de senha, busca global, totais, compartilhamento, uploads, migração em lote, transferência entre pais ou campos não textuais: faltam contratos.

## Review Focus

1. Refresh concorrente/crash pode reutilizar um token e revogar a sessão: tarefa 2 testa dois adapters reais, lease e conclusão tardia.
2. Senha incorreta na exclusão pode ser confundida com token expirado: tarefa 3 testa 401 `Invalid credentials`, sem refresh e sem logout.
3. PATCH parcial pode apagar campos/valores: tarefas 5 e 6 testam omissão, substituição integral e preservação de rascunho.
4. Unicode e escapes podem passar no limite textual e exceder bytes: tarefas 1 e 6 testam pontos de código, UTF-16 e JSON UTF-8.
5. Troca de conta/template pode mostrar respostas ou estado antigos: tarefas 4, 6 e 7 testam isolamento, botão voltar e descarte de respostas atrasadas.

## Contratos conferidos no backend local

Fontes de leitura: [autenticação](../generic-roleplay-api/src/modules/identity/presentation/http/controllers/authentication.controller.ts), [usuários](../generic-roleplay-api/src/modules/identity/presentation/http/controllers/user.controller.ts), [sistemas](../generic-roleplay-api/src/modules/rpg-content/presentation/http/systems.controller.ts), [coleções](../generic-roleplay-api/src/modules/rpg-content/presentation/http/collections.controller.ts), [templates](../generic-roleplay-api/src/modules/rpg-content/presentation/http/templates.controller.ts), [registros](../generic-roleplay-api/src/modules/rpg-content/presentation/http/records.controller.ts), [schema de conteúdo](../generic-roleplay-api/src/modules/rpg-content/domain/content.schemas.ts), [schema de registros](../generic-roleplay-api/src/modules/rpg-content/domain/records.schemas.ts) e [validação de values](../generic-roleplay-api/src/modules/rpg-content/domain/record-values.ts).

| IDs / tarefa | Método e path da API | Body / sucesso |
| --- | --- | --- |
| ID-01 / 3 | `POST /users` | `{name,email,password}` → 201 `{id}` |
| ID-02 / 3 | `POST /auth/login` | `{email,password}` → 200 TokenPair |
| ID-03 / 2 | `POST /auth/refresh` | `{refreshToken}` → 200 TokenPair rotacionado |
| ID-04 / 3 | `POST /auth/logout` | Sem body, Bearer → 204 |
| ID-05 / 3 | `DELETE /users/me` | `{password}`, Bearer → 204 |
| SYS-01/SYS-02 / 4 | `POST` / `GET /rpg-systems` | CreateSystem → 201 RpgSystem / 200 RpgSystem[] |
| SYS-03/SYS-04/SYS-05 / 4 | `GET` / `PATCH` / `DELETE /rpg-systems/:systemId` | UpdateSystem no PATCH → 200 entidade / 204 DELETE |
| COL-01/COL-02 / 4 | `POST` / `GET /rpg-systems/:systemId/collections` | CreateCollection → 201 RpgCollection / 200 RpgCollection[] |
| COL-03/COL-04/COL-05 / 4 | `GET` / `PATCH` / `DELETE /rpg-collections/:collectionId` | UpdateCollection no PATCH → 200 entidade / 204 DELETE |
| TPL-01/TPL-02 / 5 | `POST` / `GET /rpg-collections/:collectionId/templates` | CreateTemplate → 201 RpgTemplate / 200 RpgTemplate[] |
| TPL-03/TPL-04/TPL-05 / 5 | `GET` / `PATCH` / `DELETE /rpg-templates/:templateId` | UpdateTemplate no PATCH → 200 entidade / 204 DELETE |
| REC-01/REC-02 / 6 | `POST` / `GET /rpg-templates/:templateId/records` | `{values}` → 201 RpgRecord / 200 RecordPage |
| REC-03/REC-04/REC-05 / 6 | `GET` / `PATCH` / `DELETE /rpg-records/:recordId` | UpdateRecord no PATCH → 200 entidade / 204 DELETE |
| OPS-01 / 7 | `GET /health/ready` | 200 `{status:"ready"}` ou 503; uso operacional |

As vinte operações de conteúdo exigem Bearer. Listas de sistemas/coleções/templates são arrays; registros usam `{items,nextCursor?}`, sem total. Query de registros aceita somente limit decimal inteiro 1–100 (padrão 50) e cursor UUID; desconhecidos/repetidos são inválidos. Pais ficam no path, nunca no body. Schemas de conteúdo rejeitam propriedades desconhecidas.

## Sequência e arquivos

Executar 1 → 2 → 3 → 4 → 5 → 6 → 7. Cada tarefa tem testes próprios e entrega revisável. Os arquivos marcados como criar são futuros; a existência deste documento não autoriza iniciar a implementação nesta solicitação. Durante uma execução autorizada, fazer commits pequenos após as verificações da tarefa, adicionando somente seus arquivos.

### Tarefa 1 — Fundação de contratos, validadores e cliente HTTP

**Arquivos**

- Criar: `lib/api/contracts.ts`, `lib/api/config.ts`, `lib/api/transport.ts`, `lib/api/client.ts`, `lib/api/errors.ts`.
- Criar: `lib/validation/identity.ts`, `lib/validation/content.ts`, `lib/validation/records.ts`, `lib/forms/state.ts`, `.env.example`.
- Criar: `vitest.config.ts`, `tests/setup.ts`, `tests/unit/contracts.test.ts`, `tests/unit/validation.test.ts`, `tests/unit/api-client.test.ts`.
- Modificar: `package.json`, `pnpm-lock.yaml` para `server-only`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` e script `test: vitest run`. Excluir integração/e2e da seleção unitária.

**Interfaces**

- Exportar em contracts todos os tipos/decoders da spec 02, incluindo UUID, TokenPair, Create/Update de cada entidade e RecordPage; datas são strings ISO. Decoders recebem unknown e lançam erro para tipos, UUIDs, datas ou estruturas inválidas.
- `ApiFailure`, `ApiResult<T>` e `ApiRequestOptions<T>` seguem exatamente a spec 03.
- `requestApiTransport<T>(path: string, options: Omit<ApiRequestOptions<T>, "auth"> & {accessToken?: string}): Promise<ApiResult<T>>` executa uma tentativa e decodifica. É interno `server-only`; login/refresh não dependem da camada de sessão.
- `apiRequest<T>(path: string, options: ApiRequestOptions<T>): Promise<ApiResult<T>>` é a entrada dos wrappers. Nesta tarefa funciona para auth public; compor auth session na tarefa 2. Transporte não importa sessão, evitando ciclo cliente → refresh → cliente.
- `FormState = {fieldErrors?: Record<string,string>; message?: string; retryAfterSeconds?: number; requestId?: string}`. `mapApiError(error: ApiFailure): FormState` traduz status/detalhes conhecidos; conflitos de domínio são refinados pelas actions.
- `ValidationResult<T> = {valid:true; data:T} | {valid:false; fieldErrors:Record<string,string>}`. `validateRegister(input:unknown): ValidationResult<{name:string;email:string;password:string}>`, `validateLogin(input:unknown): ValidationResult<{email:string;password:string}>`, `validateDeletePassword(input:unknown): ValidationResult<{password:string}>`.
- Validadores separados `validateCreateSystem`, `validateUpdateSystem`, `validateCreateCollection`, `validateUpdateCollection`, `validateCreateTemplate`, `validateUpdateTemplate`: unknown → ValidationResult do input correspondente. PATCH não aplica defaults de criação.
- `validateRecordValues(values: unknown, fields: readonly FieldDefinition[]): ValidationResult<RecordValues>` verifica strings, keys próprias, required e maxLength sem transformar values.

- [ ] **1.1 — Preparar runner e escrever testes de contrato/validação.** Fixtures devem cobrir arrays vs RecordPage, TokenPair inválido, ISO/UUID inválidos, defaults só de criação, properties estranhas e null. Exemplos de assertions obrigatórias:

  ```ts
  expect(validateRegister({name:"😀".repeat(255), email:" A@EXAMPLE.COM ", password:"12345678", confirmPassword:"12345678"}).valid).toBe(true);
  expect(validateRegister({name:"😀".repeat(256), email:"a@example.com", password:"12345678", confirmPassword:"12345678"}).valid).toBe(false);
  expect(validateUpdateTemplate({name:"Novo"})).toEqual({valid:true, data:{name:"Novo"}});
  ```

  Acrescentar limites senha 7/8/1025, login 1/0/1025, nome bruto 1024/1025, e-mail bruto 512/513 e normalizado 255/256; conteúdo 100/101, identifier 64/65 e regex, fields 100/101, maxLength 0/fracionário/100001 e required com espaços.
- [ ] **1.2 — Executar testes antes de implementar.** `pnpm test -- tests/unit/contracts.test.ts tests/unit/validation.test.ts`: esperar falha por módulos/exports ausentes; depois implementar os contratos/validadores até todas as assertions passarem. Manter validadores locais sem importar Nest ou código do backend.
- [ ] **1.3 — Escrever testes do transporte.** `handles204WithoutJson`: nenhuma chamada de json e data undefined; `invalidSuccessFailsDecoder`: kind invalid-response; `htmlErrorKeepsStatus`: HTML 503 vira falha http; `readsDiagnosticHeaders`: Retry-After em segundos e X-Request-Id preservados; `unknownMutationOutcomeIsNotRetried`: exatamente um fetch; `utf8PayloadBoundary`: 102400 bytes permitido, 102401 rejeitado antes do fetch, incluindo Unicode/escapes.
- [ ] **1.4 — Executar testes e implementar configuração/transporte.** `pnpm test -- tests/unit/api-client.test.ts` deve falhar antes da implementação e passar depois. Validar URL absoluta, normalizar barra final, cancelar em 10 s, usar no-store, construir JSON explícito, tratar 204 antes do decoder e preservar status real quando corpo de erro for inválido. Path é interno, nunca URL fornecida pelo usuário.
- [ ] **1.5 — Verificar a entrega.** `pnpm test -- tests/unit/contracts.test.ts tests/unit/validation.test.ts tests/unit/api-client.test.ts` e `pnpm exec tsc --noEmit`: zero falhas. `.env.example` contém somente placeholders das três variáveis web; nenhum segredo real.

### Tarefa 2 — Cookie cifrado e refresh no Proxy

**Arquivos**

- Criar: `lib/auth/session.ts`, `lib/auth/refresh.ts`, `lib/auth/redirect-target.ts`, `proxy.ts`.
- Criar: testes unitários para cifragem, expiração, cookie adulterado, refresh concorrente/idempotente e redirects.
- Modificar: `lib/api/client.ts`, `package.json`, `pnpm-lock.yaml` e `.env.example`; remover pg, schema e limpeza de sessão exclusiva do Next.

**Interfaces**

- `WebSession = {tokens:TokenPair; expiresAt:number}`. `createWebSession`, `readWebSession`, `requireSession` e `destroyWebSession` operam apenas no cookie cifrado; tokens nunca saem de módulos server-only.
- `WEB_SESSION_COOKIE_ENCRYPTION_KEY` é Base64 de 32 bytes. AES-256-GCM usa IV aleatório e AAD fixa com versão; cookie adulterado/expirado é rejeitado. Sessão absoluta é no máximo quinze dias e não muda após refresh.
- `proxy.ts` renova em janela de dois minutos, atualiza o cookie tanto na resposta quanto no request encaminhado e mantém o cookie em falhas transitórias. `safeNextPath(candidate:unknown)` retorna caminho privado reconhecido ou `/systems`.
- Refresh concorrente depende da idempotência implementada no Nest; o frontend não mantém lock local nem store compartilhado.

- [ ] **2.1 — Escrever testes com relógio controlado.** Cobrir expiração do access, refresh na margem de 120000 ms, validade absoluta de quinze dias e AES-256-GCM com IV aleatório/chave de 32 bytes. Alterar ciphertext deve invalidar sessão sem expor tokens.
- [ ] **2.2 — Testar Proxy e renovação concorrente.** Simular refresh válido, 401, 429, timeout/5xx, expiração absoluta e duas requisições com mesmo refresh; backend deve devolver o mesmo par rotacionado e manter sessão ativa.
- [ ] **2.3 — Implementar cookie cifrado.** Cifrar o par de tokens no cookie HttpOnly; impor limite de 3800 bytes, Secure/SameSite=Lax/Path=/ e expiração absoluta. Não adicionar banco, tabela, dependência pg ou job de limpeza no Next.
- [ ] **2.4 — Implementar rotação no Proxy.** Renovar antes do access expirar, atualizar cookie da resposta e do request encaminhado, limpar em 401 e conservar em erros transitórios. Todas as chamadas privadas continuam usando o access token como Bearer.
- [ ] **2.5 — Validar navegação interna.** Testar `https://...`, `//...`, backslash e variantes percent-encoded rejeitadas, rotas privadas conhecidas aceitas e fallback `/systems`.

### Tarefa 3 — Identidade, shell e componentes compartilhados

**Arquivos**

- Modificar: `app/actions/login.ts`, `app/actions/register.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/login/login-form.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/register/register-form.tsx`, `lib/types.ts`, `app/layout.tsx`, `app/page.tsx`, `app/components/ui/input.tsx`.
- Criar: `app/actions/logout.ts`, `app/actions/account.ts`, `app/(authenticated)/layout.tsx`, `app/(authenticated)/settings/account/page.tsx`, `app/(authenticated)/settings/account/delete-account-form.tsx`.
- Criar: `app/components/authenticated-shell.tsx`, `app/components/ui/confirm-dialog.tsx`, `app/components/ui/textarea.tsx`, `app/components/ui/select.tsx`, `app/components/ui/checkbox.tsx`, `app/components/content/breadcrumbs.tsx`, `app/components/forms/use-unsaved-changes.ts`.
- Criar: `tests/unit/identity-actions.test.ts`, `tests/components/identity-forms.test.tsx`, `tests/components/confirm-dialog.test.tsx`, `tests/components/unsaved-changes.test.tsx`.

**Interfaces**

- Preservar `loginUser(prevState:LoginState, formData:FormData): Promise<LoginState>` e `registerUser(prevState:RegisterState, formData:FormData): Promise<RegisterState>`; adaptar estados existentes com mensagens/headers seguros e valores não sensíveis, nunca senha.
- `logoutUser(): Promise<void>` e `deleteAccount(prevState:FormState, formData:FormData): Promise<FormState>`; sucesso termina em redirect, falha retorna estado. Exclusão chama transporte com política de 401 específica, não retry genérico.
- ConfirmDialog recebe `open`, `title`, `description`, `pending`, `onCancel`, `onConfirm`; contém foco, nome acessível, Escape/cancelar e devolve foco ao disparador. Exclusão só ocorre pelo callback confirmado.
- Textarea/Select/Checkbox seguem o padrão visual de Input, com label/id/aria-describedby/aria-invalid. `useUnsavedChanges(dirty:boolean): {confirmNavigation:(href:string)=>void}` protege navegação controlada e beforeunload quando suportado, separado da confirmação destrutiva.

- [ ] **3.1 — Escrever testes de actions antes da correção.** Cadastro 201 redireciona `/login?registered=1`, sem sessão e sem confirmPassword no body; 409 aponta e-mail. Login valida par, persiste antes de redirect, preserva e-mail em erro e não retorna senha/tokens. Falha do store após autenticação tenta logout remoto uma vez e não anuncia sucesso. Executar `pnpm test -- tests/unit/identity-actions.test.ts` e confirmar os casos que falham no código atual.
- [ ] **3.2 — Corrigir cadastro/login.** Remover URLs fixas, consumir cliente/validadores, informar mínimo oito apenas no cadastro. Usar next validado, default `/systems`; `redirect()` fora do catch de rede. Pessoas já autenticadas em login/cadastro seguem para systems após leitura real da sessão. Mensagem de registered: “Conta criada. Entre para continuar.”.
- [ ] **3.3 — Testar e implementar logout/exclusão.** `wrongDeletionPasswordPreservesSession` com 401 `Invalid credentials` exige zero refresh, zero segunda exclusão e sessão preservada. `Unauthorized` permite uma recuperação; 401 desconhecido não repete cegamente. Logout 204 ou falha remota sempre encerra acesso local; falha mostra “Você saiu deste navegador. Não foi possível confirmar o encerramento da sessão no servidor.”. Exclusão 204 vai a `/login?deleted=1` com “Conta excluída.”; 404 encerra acesso sem afirmar exclusão; demais falhas preservam tela/rascunho.
- [ ] **3.4 — Construir shell/conta.** Links systems/account/Sair; sessão verificada em cada action e página. Conta não busca perfil inexistente. Mostrar “Excluir sua conta remove todos os seus sistemas, coleções, templates e registros. Esta ação não pode ser desfeita.”; exigir senha e checkbox “Quero excluir minha conta”, enviando apenas password. Atualizar lang/metadata e entrada autenticada na home.
- [ ] **3.5 — Implementar acessibilidade e rascunho.** Testes exigem label/control associados, IDs únicos, resumo anunciado/foco no primeiro erro, diálogo operável por teclado, cancelar sem requisição, pending sem dupla submissão, dados não sensíveis preservados, confirmação antes de navegação controlada com dirty true. Bloquear callbacks repetidos enquanto pending.
- [ ] **3.6 — Validar ID-A01–ID-A08 e S-01/S-04/S-06.** Executar os quatro arquivos de teste desta tarefa e `pnpm exec tsc --noEmit`; confirmar também que os resultados serializados não contêm password, confirmPassword ou TokenPair.

### Tarefa 4 — Sistemas e coleções com CRUD e navegação

**Arquivos**

- Criar: `lib/api/systems.ts`, `lib/api/collections.ts`, `lib/content/navigation.ts`, `lib/content/revalidation.ts`, `app/actions/systems.ts`, `app/actions/collections.ts`.
- Criar em `app/(authenticated)/`: `systems/page.tsx`, `systems/new/page.tsx`, `systems/[systemId]/page.tsx`, `systems/[systemId]/edit/page.tsx`, `systems/[systemId]/collections/new/page.tsx`, `collections/[collectionId]/page.tsx`, `collections/[collectionId]/edit/page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Criar: `app/components/content/system-form.tsx`, `app/components/content/collection-form.tsx`, `tests/unit/content-actions.test.ts`, `tests/components/content-forms.test.tsx`.

**Interfaces**

- systems: `listSystems(): Promise<ApiResult<RpgSystem[]>>`, `getSystem(id:UUID)`, `createSystem(input:CreateSystem)`, `updateSystem(id:UUID,input:UpdateSystem)` → Promise<ApiResult<RpgSystem>>; `deleteSystem(id:UUID): Promise<ApiResult<void>>`.
- collections: `listCollections(systemId:UUID): Promise<ApiResult<RpgCollection[]>>`, `getCollection(id:UUID)`, `createCollection(systemId:UUID,input:CreateCollection)`, `updateCollection(id:UUID,input:UpdateCollection)` → Promise<ApiResult<RpgCollection>>; `deleteCollection(id:UUID): Promise<ApiResult<void>>`.
- Actions: `createSystemAction(prev:FormState,data:FormData)`, `updateSystemAction(id:UUID,prev:FormState,data:FormData)`, `deleteSystemAction(id:UUID,prev:FormState,data:FormData)`; coleção segue os mesmos nomes com Collection e create recebe systemId. Todas retornam Promise<FormState> em erro ou redirect em sucesso.
- `resolveCollectionAncestors(collection:RpgCollection): Promise<ApiResult<{system:RpgSystem}>>`; a leitura utiliza systemId do DTO. `revalidateContentPaths(paths:readonly string[], cascade:boolean): void` revalida paths concretos; cascata também invalida padrões `/collections/[collectionId]`, `/templates/[templateId]`, `/records/[recordId]` e suas edições com type page, pois descendentes possuem URLs fora do pai.

- [ ] **4.1 — Escrever testes de contrato/actions.** Cada wrapper deve verificar método/path/body/decoder/Bearer; GET list recebe array sem envelope. UUID inválido não chama API; `emptyParentDiffersFromMissingParent` não mostra vazio para 404; `renamePreservesIdentifier` PATCH só name; `clearDescription` envia `""`; `cancelDoesNotDelete` zero DELETE. Executar testes para confirmar ausência dos módulos.
- [ ] **4.2 — Implementar wrappers e loaders.** Páginas seguem rotas da spec 05. systems é a lista inicial; detalhe de sistema carrega coleções; detalhe de coleção resolve sistema e posteriormente templates. Coleção inexistente/de outra conta mostra “Recurso não encontrado.”. Até tarefa 5, não apresentar controles fictícios de templates.
- [ ] **4.3 — Implementar forms/actions.** Criar navega pelo ID da resposta; update envia só alterações e usa datas retornadas. Identifier explícito, preservado em renomeação; ajuda “Comece com uma letra minúscula. Use letras minúsculas, números, _ ou -.”. Duplicidade e quota 100 têm mensagens distintas; quota por corrida, 413/rede/429 mantêm rascunho. Sem query de paginação/busca para sistemas/coleções.
- [ ] **4.4 — Implementar exclusões e atualização.** Mostrar nome e textos exatos de cascata da spec 05. 204 navega à lista/pai; 404 atualiza item obsoleto sem afirmar que excluiu; falha não remove otimisticamente. Revalidar detalhe e lista pai antes de redirect, invalidar páginas descendentes e limpar estado cliente.
- [ ] **4.5 — Validar SC-01–SC-08.** Testar identifier repetido no mesmo pai versus permitido em outro, quota 100/101 via respostas, PATCH igual/datas, UTF-16 bruto e teclado. Rodar `pnpm test -- tests/unit/content-actions.test.ts tests/components/content-forms.test.tsx`; isolamento real de duas contas será exercitado na tarefa 7.

### Tarefa 5 — Templates e editor ordenado de campos

**Arquivos**

- Criar: `lib/api/templates.ts`, `lib/templates/field-draft.ts`, `app/actions/templates.ts`, `app/components/templates/template-form.tsx`, `app/components/templates/field-editor.tsx`.
- Criar em `app/(authenticated)/`: `collections/[collectionId]/templates/new/page.tsx`, `templates/[templateId]/page.tsx`, `templates/[templateId]/edit/page.tsx`.
- Modificar: `app/(authenticated)/collections/[collectionId]/page.tsx` para listar templates reais e CTA.
- Criar: `tests/unit/template-actions.test.ts`, `tests/components/field-editor.test.tsx`.

**Interfaces**

- `listTemplates(collectionId:UUID): Promise<ApiResult<RpgTemplate[]>>`, `getTemplate(id:UUID)`, `createTemplate(collectionId:UUID,input:CreateTemplate)`, `updateTemplate(id:UUID,input:UpdateTemplate)` → Promise<ApiResult<RpgTemplate>>; `deleteTemplate(id:UUID): Promise<ApiResult<void>>`.
- Actions `createTemplateAction(collectionId:UUID,prev:FormState,data:FormData)`, `updateTemplateAction(templateId:UUID,prev:FormState,data:FormData)`, `deleteTemplateAction(templateId:UUID,prev:FormState,data:FormData)` retornam Promise<FormState> ou redirect.
- `FieldDraft = {rowId:string; key:string; label:string; description:string; required:boolean; maxLength:string; format:FieldDefinition["format"]}`. `serializeFieldDraft(rows:readonly FieldDraft[]): ValidationResult<FieldDefinitionInput[]>` omite rowId e maxLength vazio; rejeita valor numérico inválido.
- `FieldEditor({rows,onChange,fieldErrors,pending})` usa IDs estáveis e snapshot de rowIds da submissão para mapear `fields.<index>.<property>`. `buildTemplatePatch(saved:RpgTemplate,draft:CreateTemplate): UpdateTemplate` omite fields se inalterado, envia array inteiro se definição/ordem mudou.

- [ ] **5.1 — Escrever testes de payload/editor.** Metadata-only omite fields; editar uma linha mantém as demais; defaults required false/format text; [] válido; 100/101; keys duplicadas; maxLength vazio/zero/fração; reordenar por botão mantém foco e identidade; rowId nunca no payload. Executar `pnpm test -- tests/unit/template-actions.test.ts tests/components/field-editor.test.tsx` e confirmar falha antes dos módulos.
- [ ] **5.2 — Implementar metadados/editor.** Category é texto livre, não enum/schema. Botões Mover para cima/baixo/Remover, contador campos/JSON, descrição por textarea e format por select. Bloquear reordenação durante pending; erros de índice usam snapshot enviado. Remover campo em template existente exige confirmação contextual; alterar key avisa sobre mudança estrutural.
- [ ] **5.3 — Conectar rotas/actions e conflitos.** Carregar ancestrais pelo DTO, salvar resposta válida, atualizar coleção/detalhe. Diferenciar identifier, quota, `Template change would invalidate existing records`, 413 e 409 desconhecido. Conflito mantém rascunho/metadados locais e oferece “Recarregar versão salva” explicitamente; não migrar/truncar/apagar valores nem simular validação global pela primeira página.
- [ ] **5.4 — Conectar exclusão.** Texto “Excluir este template também remove todos os seus registros. Esta ação não pode ser desfeita.”. 204 volta à coleção e invalida registros; cancelar não faz DELETE. O detalhe só incorpora lista/CTA de registros reais quando a tarefa 6 estiver concluída.
- [ ] **5.5 — Validar T-A01–T-A08.** Tests unitários/componentes passam; preparar no teste integrado um registro de comprimento 20 e reduzir maxLength para 10: esperar 409 e rollback integral, sem mudança de timestamps/metadados. Testar também key preenchida renomeada, novo campo opcional aceito e obrigatório rejeitado.

### Tarefa 6 — Registros textuais, formulários dinâmicos e paginação

**Arquivos**

- Criar: `lib/api/records.ts`, `lib/records/record-draft.ts`, `app/actions/records.ts`, `app/components/records/record-form.tsx`, `app/components/records/record-list.tsx`, `app/components/records/record-values.tsx`.
- Criar em `app/(authenticated)/`: `templates/[templateId]/records/new/page.tsx`, `records/[recordId]/page.tsx`, `records/[recordId]/edit/page.tsx`.
- Criar: `app/api/templates/[templateId]/records/route.ts` (GET same-origin do web, específico para paginação).
- Modificar: `app/(authenticated)/templates/[templateId]/page.tsx` para primeira página e CTA.
- Criar: `tests/unit/record-actions.test.ts`, `tests/unit/record-pagination-route.test.ts`, `tests/components/record-form.test.tsx`, `tests/components/record-list.test.tsx`.

**Interfaces**

- `listRecords(templateId:UUID,query:ListRecordsQuery): Promise<ApiResult<RecordPage>>`, `getRecord(id:UUID)`, `createRecord(templateId:UUID,input:CreateRecord)`, `updateRecord(id:UUID,input:UpdateRecord)` → Promise<ApiResult<RpgRecord>>; `deleteRecord(id:UUID): Promise<ApiResult<void>>`.
- `RecordFieldDraft = {included:boolean; value:string}`; draft indexado pela key, incluindo opcionais só quando Object.hasOwn for verdadeiro na edição. `buildRecordValues(fields:readonly FieldDefinition[],draft:Record<string,RecordFieldDraft>): ValidationResult<RecordValues>` usa allowlist e objeto sem protótipo/Object.fromEntries.
- `recordSchemaFingerprint(fields:readonly FieldDefinition[]): string` compara a definição ordenada exibida com a atual; fingerprint é informação de UI e nunca vai ao backend. A action recarrega registro/template pelo servidor e não confia em schema recebido no formulário.
- `RecordFormState = FormState & {schemaChanged?:boolean; currentFields?:FieldDefinition[]}`. `createRecordAction(templateId:UUID,prev:RecordFormState,data:FormData)` e `updateRecordAction(recordId:UUID,prev:RecordFormState,data:FormData)` retornam Promise<RecordFormState>; `deleteRecordAction(recordId:UUID,prev:FormState,data:FormData)` retorna Promise<FormState> ou redirect.
- GET web aceita somente limit/cursor, verifica sessão e UUID, consulta wrapper e devolve RecordPage seguro com no-store. Ausência de sessão é JSON 401 (sem HTML de redirect); store indisponível é 503. Erros mantêm status pertinente e headers seguros, sem TokenPair ou dados internos.

- [ ] **6.1 — Escrever testes de formulário/values.** `editingOneFieldPreservesOthers` exige payload completo; ausente difere de vazio; required com espaços falha; desmarcar opcional remove key. Arrays vazios enviam `{values:{}}`; `constructor`/`prototype` funcionam como keys próprias; unknown key falha. Strings “  Amizade  ”, “Material: visco\n\n✨” e HTML retornam literalmente; emoji comprimento 2 não passa maxLength 1. Executar teste antes da implementação e depois até passar.
- [ ] **6.2 — Implementar criação/edição/leitura.** Formulário na ordem atual de fields, text por Input e textarea por Textarea, ajuda/contador/erro acessíveis. Opcionais têm “Incluir este campo”; obrigatórios sempre incluídos. Não usar dangerouslySetInnerHTML. Leitura distingue “Não preenchido” de “Vazio”; rótulo usa values.name somente se definido/preenchido, senão “Registro <id>”.
- [ ] **6.3 — Implementar actions e mudança de definição.** Antes de POST/PATCH recarregar template; se fingerprint mudou, retornar schemaChanged e mensagem “A definição deste template mudou. Revise os campos antes de salvar.”. Rascunho conserva valores de keys removidas para cópia e permite revisão explícita; não os enviar como válidos. Corrida posterior pode dar 400 `values.<key>`: associar erro e oferecer recarga mantendo rascunho. Quota 1000/413/rede não truncam nem repetem mutação.
- [ ] **6.4 — Escrever testes de paginação/handler.** 51 registros → 50 com nextCursor, mais um sem cursor; próxima página deduplica IDs; erro preserva lista; pending bloqueia clique repetido; troca de template/conta descarta resposta antiga. Handler rejeita query repetida/desconhecida, 1.5, 1e1, 0, 101 e cursor inválido sem fetch. Sessão ausente/dados privados usam 401/404; store fora usa 503.
- [ ] **6.5 — Implementar paginação.** Primeira página via Server Component com limit 50; botão “Carregar mais” chama GET dedicado usando exatamente nextCursor e mesmo limit. Usar AbortController e identidade da lista para ignorar respostas antigas. Criar/excluir/atualizar lista reinicia a primeira página, sem reaproveitar cursor; mostrar “N registros carregados”, sem total ou número de páginas. Quota não é inferida de página parcial.
- [ ] **6.6 — Implementar exclusão e atualização.** Texto “Excluir este registro? Esta ação não pode ser desfeita.”. 204 volta ao template e reinicia lista; template/schema são preservados. 404 remove estado obsoleto sem alegar sucesso da tentativa. Revalidar lista e detalhe; cascata do pai torna detalhe indisponível.
- [ ] **6.7 — Validar R-A01–R-A09.** Executar os quatro arquivos de teste desta tarefa e TypeScript; confirmar POST só `{values}`, PATCH integral, limite UTF-8 incluindo escapes, no-op/datas reais e ausência de conversões/truncamento.

### Tarefa 7 — Integração real, jornadas e critérios de entrega

**Arquivos**

- Criar: `playwright.config.ts`, `tests/e2e/fixtures/api.ts`, `tests/e2e/identity.spec.ts`, `tests/e2e/content-journey.spec.ts`, `tests/e2e/schema-conflicts.spec.ts`, `tests/e2e/pagination.spec.ts`, `tests/e2e/account-isolation.spec.ts`, `tests/e2e/accessibility.spec.ts`, `docs/web-runtime.md`.
- Modificar: `package.json`, `pnpm-lock.yaml` para `@playwright/test` e script test:e2e; `.env.example` e componentes das tarefas anteriores apenas se verificações revelarem falhas.

**Interfaces e ambiente**

- Tests E2E consomem as rotas web, criando dados isolados pelos endpoints existentes. Nenhuma credencial/dado de produção; não editar/migrar código do backend como parte do plano.
- Web 3000/API 3001 como exemplo, API de teste com migrações existentes aplicadas pelo responsável do ambiente e `WEB_SESSION_COOKIE_ENCRYPTION_KEY` configurada em todas as instâncias. O Next não precisa de banco próprio de sessão.
- OPS-01 é verificação operacional; readiness 200 não comprova tabelas RPG. A jornada CRUD verifica essas capacidades. Deployment remoto e rate limit precisam validação própria; leitura local não comprova paridade de produção.

- [ ] **7.1 — Montar ambiente e escrever jornadas.** Registrar/login → sistema → coleção → template com campos → registro → editar um valor mantendo outro → recarregar → mudança de schema compatível → conflito incompatível → excluir registro/template/coleção/sistema → logout. Outra árvore com descendentes testa cascata. Exclusão de conta em cenário separado confirma perda de acesso das sessões.
- [ ] **7.2 — Executar contra a API real de teste.** Exercitar quotas/conflitos conhecidos, 51 registros e cursor de registro removido; templates vazios; formatos; Unicode e HTML literal; PATCH igual preserva updatedAt; mudança incompatível retorna 409 sem alteração dos metadados. Fixtures não devem falsificar resultados da API.
- [ ] **7.3 — Verificar concorrência e isolamento.** Duas abas/instâncias, refresh perdido/lease vencido, logout concorrente, segundo 401 sem loop, chamada direta a action por visitante, conta B com IDs de A recebendo 404, voltar após logout/troca de conta sem dados anteriores. Verificar navegador/HTML/retornos de action sem tokens e storage sem credenciais.
- [ ] **7.4 — Verificar interface.** Teclado, foco do primeiro erro/diálogo, Escape/cancelar, 360 px e desktop, textos grandes, 100 campos e identifier 64; loading/vazio/erro separados, pending, rascunhos e reduced motion. Sem contagem fictícia de descendentes nem formulário com HTML ativo.
- [ ] **7.5 — Documentar dependências do runtime.** Store/chave de 32 bytes, limpeza por expiração e invalidação por troca de chave; limite de body Next/borda compatível com JSON válido até 100 KiB, considerando overhead de FormData. BFF chama API do servidor, sem exigir CORS browser→API. Rate limit atual inclui 5 logins/15 min por IP/conta e pode ser compartilhado pelo IP do web; confirmar capacidade/cadeia confiável sem encaminhar X-Forwarded-For arbitrário. Se exigir ajuste de backend/borda, registrar dependência externa e preservar backend.
- [ ] **7.6 — Executar validação final.** Na raiz web: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`. Exigir zero erros; build não consulta dados privados para prerender. Comandos e scripts são planejados, não evidência de execução nesta entrega documental.
- [ ] **7.7 — Registrar conclusão real.** Matriz ID-01–ID-05, SYS-01–SYS-05, COL-01–COL-05, TPL-01–TPL-05, REC-01–REC-05 e OPS-01 deve apontar testes/jornadas executados. Anotar resultados, infraestrutura indisponível e validações remotas pendentes; não marcar critério sem evidência. Revisar diff final: somente web; backend intacto.

## Critério de conclusão do planejamento

Este arquivo cobre as nove specs, os contratos locais e a sequência de implementação, incluindo dependências externas explicitadas. A entrega documental termina com `plans.md` salvo e revisado. As checkboxes permanecem abertas porque criar este plano não implementa nem testa as funcionalidades.
