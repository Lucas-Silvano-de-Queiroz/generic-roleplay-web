# Frontend faltante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** completar no frontend os fluxos de identidade e conteúdo já suportados pela API.

**Architecture:** Next App Router com leituras em Server Components, ações de mutação no servidor e componentes de formulário no cliente. Um cliente HTTP server-only consome a API; o par de tokens fica cifrado em cookie HttpOnly e o Proxy renova o access token. Conteúdo segue sistema → coleção → template → registro.

**Tech Stack:** Next 16.3.0, React 19.2.8, TypeScript e Tailwind 4 existentes; dependência de runtime `server-only`, Vitest/Testing Library/Playwright para testes. Cifragem por `node:crypto`, sem nova biblioteca de JWT para autorização.

**Spec:** [índice das specs](README.md), com contratos em [02](02-contratos-da-api.md), integração em [03](03-integracao-e-sessao.md), domínios em [04](04-identidade.md)–[07](07-registros.md) e dependências em [09](09-validacao-e-dependencias.md).

## Global Constraints

- Produto e mensagens em português; `lang="pt-BR"`.
- API_BASE_URL exclusiva do servidor; tokens nunca vão para localStorage/sessionStorage, props ou retorno de action.
- Payload JSON até 100 KiB (102400 bytes); sem truncamento de valores ou senha.
- Até 100 coleções/sistema, 100 templates/coleção, 100 campos/template e 1000 registros/template.
- Password cadastro/exclusão: 8–1024 UTF-16; login: 1–1024; limites completos são os da spec 02.
- Cookie opaco e store compartilhado; access quinze minutos, sessão absoluta quinze dias; renovar o par uma única vez por operação coordenada.
- `fields`/`values` enviados em PATCH substituem integralmente; omitidos preservam.
- Valores ficam literais; todos os valores são strings e HTML é escapado.
- GET privado sem cache; 204 sem JSON; nenhuma repetição automática de mutação após resultado desconhecido.
- Ler guias da versão instalada em `node_modules/next/dist/docs/` conforme AGENTS.md antes de escrever código Next.

## Review Focus

1. Refresh simultâneo pode reutilizar o token anterior: Nest deve devolver o mesmo par rotacionado; Task 2 valida essa dependência.
2. 401 por senha incorreta na exclusão pode ser confundido com expiração: Task 3 testa preservação da sessão e ausência de retry.
3. PATCH parcial de values ou default de fields pode apagar conteúdo: Tasks 5/6 testam omissão e substituição completa.
4. Unicode pode respeitar limite de caracteres e ultrapassar bytes do body: Tasks 1/6 testam UTF-16, pontos de código e JSON UTF-8.
5. Dados de outra conta ou resposta tardia de lista podem aparecer após troca de sessão/template: Tasks 4/6/7 testam isolamento, cache e descarte de resposta.

Todos os caminhos abaixo são relativos à raiz **generic-roleplay-web**. Arquivos marcados “Criar” são propostos e ainda não existem. As únicas implementações atuais reutilizadas são rotas/actions de identidade e componentes básicos. Executar tarefas em ordem; validação pertence à própria entrega, não somente à última tarefa.

## Task 1 — Contratos, validação e cliente HTTP

**Arquivos**

- Criar: `lib/api/contracts.ts`, `lib/api/client.ts`, `lib/api/errors.ts`, `lib/validation/identity.ts`, `lib/validation/content.ts`, `lib/validation/records.ts`, `lib/forms/state.ts`.
- Criar: `vitest.config.ts`, `tests/setup.ts`, `tests/unit/api-client.test.ts`, `tests/unit/validation.test.ts`, `.env.example` sem segredos reais.
- Modificar: `package.json` e lockfile para dependências de teste; adicionar scripts `test` e `test:integration` (excluindo integração da execução unitária padrão).

**Interfaces**

- Consome: tipos e regras da spec 02.
- Produz: todos os DTOs e decoders da spec 02, `ApiFailure`, `ApiResult<T>`, `ApiRequestOptions<T>` e `apiRequest<T>(path, options)` da spec 03. Nesta tarefa validar transporte público; composição com sessão entra na Task 2.
- Produz em `lib/forms/state.ts`: `FormState = { fieldErrors?: Record<string, string>; message?: string; retryAfterSeconds?: number; requestId?: string }` e `mapApiError(error: ApiFailure): FormState`. Mensagens vêm da tabela da spec 02, com fallback para erro desconhecido.
- Produz validadores `validateRegister(input)`, `validateLogin(input)`, `validateContent(kind, input)` e `validateRecordValues(values, fields)`, retornando `{valid: boolean; fieldErrors: Record<string,string>}`. `kind` é `system | collection | template`; inputs têm os tipos da spec 02 (cadastro inclui confirmação só para validação).

- [ ] Criar fixtures/testes `registrationLimits`, `contentLimits`, `recordValuesRules`: senha 7 inválida/8 válida/1025 inválida; login senha 1 válida; nome 255 emoji válido/256 inválido; fields 100 válido/101 inválido e required com espaços inválido.
- [ ] Executar `pnpm test -- tests/unit/validation.test.ts`: inicialmente falha por módulos ausentes; depois de implementar validadores deve passar, preservando espaços de values.
- [ ] Criar testes `handles204WithoutJson`, `handlesHtmlError`, `readsRetryAfterAndRequestId`, `rejectsOversizedUtf8Json`, `doesNotRetryUnknownMutationOutcome`. Exigir 204 com data undefined, erro controlado sem JSON e exatamente um fetch na falha de rede de POST.
- [ ] Implementar transporte/configuração, validar sucesso por DTO e medir body UTF-8. Redirecionamento de Next fica na action, fora do catch do transporte. Não instalar/usar schemas Nest no web.
- [ ] Executar `pnpm test -- tests/unit/api-client.test.ts tests/unit/validation.test.ts` e `pnpm exec tsc --noEmit`; confirmar todas as assertions passando.

## Task 2 — Cookie cifrado e refresh no Proxy

**Arquivos**

- Criar: `lib/auth/session.ts`, `lib/auth/refresh.ts`, `proxy.ts`.
- Criar: testes de cifragem, expiração, cookie adulterado, Proxy e refresh concorrente/idempotente.
- Modificar: `lib/api/client.ts`, `.env.example`, `package.json` e lockfile; remover store de sessão próprio do Next e dependência `pg`.

**Interfaces**

- Consome: TokenPair/ApiResult da Task 1.
- Produz: `SessionContext`, `createWebSession(tokens)`, `requireSession()` e `destroyWebSession()` da spec 03; `WebSession` contém TokenPair cifrado em cookie.
- Produz `WebSession = {tokens:TokenPair; expiresAt:number}` cifrada em cookie `HttpOnly` com AES-256-GCM.
- Produz Proxy que renova na margem de dois minutos e atualiza o cookie de resposta e a requisição encaminhada. Refresh concorrente requer idempotência do Nest; não há mutex em memória nem banco de sessão no Next.

- [ ] Testar cookie adulterado/expirado, limite de tamanho, margem de refresh, 401, 429, timeout e par idempotente em requests concorrentes.
- [ ] Implementar cookie HttpOnly cifrado com chave de 32 bytes, IV aleatório, limite de 3800 bytes e validade absoluta máxima de 15 dias.
- [ ] Implementar Proxy para renovar com `/auth/refresh` e propagar cookie atualizado para Server Components/Actions na mesma requisição.
- [ ] Compor `apiRequest` para decifrar a sessão apenas no servidor e adicionar Bearer; API continua validando assinatura e sessão ativa.

## Task 3 — Identidade completa e shell autenticado

**Arquivos**

- Modificar: `app/actions/login.ts`, `app/actions/register.ts`, formulários em `app/(auth)/login/` e `app/(auth)/register/`, `lib/types.ts`, `app/layout.tsx`, `app/page.tsx`.
- Criar: `app/actions/logout.ts`, `app/actions/account.ts`, `app/(authenticated)/layout.tsx`, `app/(authenticated)/settings/account/page.tsx`, `app/(authenticated)/settings/account/delete-account-form.tsx`, `app/components/authenticated-shell.tsx`, `app/components/ui/confirm-dialog.tsx`.
- Criar: `tests/unit/identity-actions.test.ts`, `tests/components/identity-forms.test.tsx`.

**Interfaces**

- Consome: validação/erros da Task 1 e sessão da Task 2.
- Produz: `loginUser(prevState, formData): Promise<LoginState>` e `registerUser(prevState, formData): Promise<RegisterState>` existentes ajustados; estados podem incorporar campos seguros de FormState.
- Produz: `logoutUser(): Promise<void>` e `deleteAccount(prevState: FormState, formData: FormData): Promise<FormState>`; sucesso usa redirect, falha usa estado.
- Produz: shell com links `/systems`, `/settings/account` e logout; ConfirmDialog com alvo, descrição, cancelar, confirmar e estado pending.

- [ ] Testar `registerRedirectsToLoginWithoutSession`, `loginPersistsBeforeRedirect`, `rejectsExternalNext`, `wrongDeletionPasswordPreservesSession`, `logoutClearsLocalEvenWhenRemoteFails` e `deletionSuccessClearsSession`. 401 Invalid credentials de exclusão exige zero refresh/retry.
- [ ] Corrigir oito caracteres, limites e mensagens; centralizar API_BASE_URL; criar sessão e redirects conforme spec 04. Não chamar GET de perfil inexistente.
- [ ] Implementar shell e tela de conta; validar sessão dentro de cada action. ConfirmDialog suporta foco/Escape/cancelamento sem chamada à API.
- [ ] Atualizar `lang="pt-BR"`, metadata e entrada autenticada da home. Incluir alertas de registrado/excluído/saída local sem tokens em query.
- [ ] Executar `pnpm test -- tests/unit/identity-actions.test.ts tests/components/identity-forms.test.tsx`; confirmar limites, redirects e ausência de dados sensíveis no estado serializado.

## Task 4 — Sistemas e coleções

**Arquivos**

- Criar: `lib/api/systems.ts`, `lib/api/collections.ts`, `app/actions/systems.ts`, `app/actions/collections.ts`.
- Criar em `app/(authenticated)/`: `systems/page.tsx`, `systems/new/page.tsx`, `systems/[systemId]/page.tsx`, `systems/[systemId]/edit/page.tsx`, `systems/[systemId]/collections/new/page.tsx`, `collections/[collectionId]/page.tsx`, `collections/[collectionId]/edit/page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Criar: `app/components/content/system-form.tsx`, `app/components/content/collection-form.tsx`, `app/components/content/breadcrumbs.tsx`, `app/components/ui/textarea.tsx`.
- Criar: `tests/unit/content-actions.test.ts`, `tests/components/content-forms.test.tsx`.

**Interfaces**

- Produz wrappers em `systems.ts`: `listSystems(): Promise<ApiResult<RpgSystem[]>>`, `getSystem(id)`, `createSystem(input)`, `updateSystem(id,input)` com resultado `ApiResult<RpgSystem>` e `deleteSystem(id): Promise<ApiResult<void>>`.
- Produz wrappers em `collections.ts`: `listCollections(systemId): Promise<ApiResult<RpgCollection[]>>`, `getCollection(id)`, `createCollection(systemId,input)`, `updateCollection(id,input)` com resultado `ApiResult<RpgCollection>` e `deleteCollection(id): Promise<ApiResult<void>>`.
- IDs são UUID strings; inputs são Create/UpdateSystem/Collection da Task 1. Actions produzem FormState ou redirect.
- Consome ConfirmDialog e shell da Task 3. Lista de templates na coleção será ligada na Task 5; até lá mostrar a navegação de coleção sem controles fictícios.

- [ ] Testar `emptyParentDiffersFromMissingParent`, `renamePreservesIdentifier`, `identifierConflictStaysOnField`, `clearingDescriptionSendsEmptyString`, `foreignResourceUsesSame404`, `cancelDoesNotDelete` e `cascadeInvalidatesDescendants`.
- [ ] Implementar wrappers e páginas/ações exatamente nas rotas da spec 05; UUID/ownership validados, arrays sem envelope, sem paginação/busca inventada.
- [ ] Implementar formulários, estados e breadcrumbs; erro de quota distinto de conflito de identifier; impedir remoção visual antecipada em falha.
- [ ] Executar `pnpm test -- tests/unit/content-actions.test.ts tests/components/content-forms.test.tsx`; SC-01 a SC-08 devem ser observáveis em fixtures e jornadas futuras.

## Task 5 — Templates e schema ordenado

**Arquivos**

- Criar: `lib/api/templates.ts`, `app/actions/templates.ts`, `app/components/templates/template-form.tsx`, `app/components/templates/field-editor.tsx`, `app/components/ui/select.tsx`, `app/components/ui/checkbox.tsx`.
- Criar em `app/(authenticated)/`: `collections/[collectionId]/templates/new/page.tsx`, `templates/[templateId]/page.tsx`, `templates/[templateId]/edit/page.tsx`.
- Modificar: `app/(authenticated)/collections/[collectionId]/page.tsx` para lista real de templates.
- Criar: `tests/components/field-editor.test.tsx`, `tests/unit/template-actions.test.ts`.

**Interfaces**

- Produz: `listTemplates(collectionId): Promise<ApiResult<RpgTemplate[]>>`, `getTemplate(id)`, `createTemplate(collectionId,input)`, `updateTemplate(id,input)` com resultado `ApiResult<RpgTemplate>` e `deleteTemplate(id): Promise<ApiResult<void>>`.
- FieldEditor consome `FieldDefinitionInput[]`, produz array completo ordenado e erros por índice; IDs internos ficam fora da API.
- Consome contratos/validadores, coleção e ConfirmDialog. Lista de registros no detalhe será ligada na Task 6.

- [ ] Testar `metadataPatchOmitsFields`, `oneFieldEditSendsCompleteArray`, `stableRowsFollowKeyboardReorder`, `emptyTemplateIsValid`, `conflictRetainsDraftAndSavedMetadata`, `fieldIndexErrorUsesSubmissionSnapshot`.
- [ ] Implementar editor e forms conforme spec 06, max 100 e formatos text/textarea; defaults e limpeza de propriedade opcionais explícitos.
- [ ] Conectar conflitos de identifier/quota/schema por mensagem reconhecida com fallback; não oferecer migração automática. Criar/excluir atualiza coleção; schema atualiza detalhe e futuros formulários.
- [ ] Executar `pnpm test -- tests/components/field-editor.test.tsx tests/unit/template-actions.test.ts`; exigir array integral, order, omissão e rascunho preservado.

## Task 6 — Registros e lista paginada

**Arquivos**

- Criar: `lib/api/records.ts`, `app/actions/records.ts`, `app/components/records/record-form.tsx`, `app/components/records/record-list.tsx`, `app/components/records/record-values.tsx`.
- Criar em `app/(authenticated)/`: `templates/[templateId]/records/new/page.tsx`, `records/[recordId]/page.tsx`, `records/[recordId]/edit/page.tsx`.
- Criar: `app/api/templates/[templateId]/records/route.ts` como GET same-origin dedicado à paginação, sessão validada e DTO seguro; não é novo endpoint da API Nest nem proxy genérico.
- Modificar: `app/(authenticated)/templates/[templateId]/page.tsx` para primeira página de registros.
- Criar: `tests/unit/record-actions.test.ts`, `tests/components/record-form.test.tsx`, `tests/components/record-list.test.tsx`.

**Interfaces**

- Produz: `listRecords(templateId,query:ListRecordsQuery): Promise<ApiResult<RecordPage>>`, `getRecord(id)`, `createRecord(templateId,input)`, `updateRecord(id,input)` com resultado `ApiResult<RpgRecord>` e `deleteRecord(id): Promise<ApiResult<void>>`.
- RecordForm consome template completo e registro opcional; produz `{values}` completo, com inclusão explícita de campos opcionais. Action recarrega template para comparação/validação.
- GET do web aceita somente limit/cursor, limita dados ao template autorizado, retorna RecordPage no sucesso e erro seguro no status correspondente; headers no-store. RecordList usa esse endpoint para carregar mais sem expor tokens.

- [ ] Testar `editingOneFieldPreservesOthers`, `omittedAndEmptyAreDifferent`, `requiredWhitespaceFailsWithoutTrimming`, `literalUnicodeAndHtmlRoundTrip`, `constructorIsOwnKey`, `emptyTemplateSendsEmptyValues`.
- [ ] Testar `fiftyOneRecordsUseTwoPages`, `failedNextPageKeepsItems`, `staleOtherTemplateResponseIsDiscarded`, `creationResetsCursor`, `schemaChangePreservesDraft`, `utf8BodyLimitDoesNotTruncate`.
- [ ] Implementar formulário, leitura literal e lista conforme spec 07; query decimal, default 50, nextCursor somente quando fornecido; sem total, busca ou schema por categoria.
- [ ] Implementar POST/PATCH/DELETE, validação da definição atual e invalidar pai. PATCH values é objeto inteiro; atualizar estado apenas após resposta válida.
- [ ] Executar `pnpm test -- tests/unit/record-actions.test.ts tests/components/record-form.test.tsx tests/components/record-list.test.tsx`; confirmar R-A01 a R-A09, incluindo paginação e troca de contexto.

## Task 7 — Jornadas, acessibilidade e ambiente integrado

**Arquivos**

- Criar: `playwright.config.ts`, `tests/e2e/identity.spec.ts`, `tests/e2e/content-journey.spec.ts`, `tests/e2e/account-isolation.spec.ts`, `tests/e2e/accessibility.spec.ts` e fixtures de ambiente isolado.
- Modificar: `package.json` e lockfile para script `test:e2e`; arquivos de UI das Tasks 3–6 somente quando as verificações demonstrarem necessidade; `.env.example` e docs operacionais.
- Modificar: `app/components/ui/input.tsx` para associação acessível do erro, sem alterar o contrato visual existente.

**Interfaces**

- Consome: todas as rotas/actions/DTOs anteriores; ambiente da spec 09 com API e web em portas distintas, banco da API migrado e chave de sessão compartilhada entre instâncias Next.
- Produz: scripts de validação reproduzíveis e jornada completa sobre a API real de teste; nenhum uso de credenciais/dados de produção.

- [ ] Implementar jornadas da spec 09, inclusive segundo usuário, cascatas, exclusão de conta, recarga e sessão após logout. Mock não substitui a verificação do contrato integrado.
- [ ] Testar teclado, foco do primeiro erro, aria-describedby, diálogo de exclusão, 360 px e 100 campos. Confirmar literalidade do HTML e ausência de tokens no HTML/resultados serializados e storage do browser.
- [ ] Verificar rate limit entre chamadas do web, proxy confiável e deploy com duas instâncias antes da liberação. Readiness 200 exige ainda CRUD de RPG para comprovar schema.
- [ ] Executar `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` e `pnpm build` no ambiente documentado. Resultado exigido: zero erros, cenários críticos aprovados, build sem buscar dados privados no prerender.
- [ ] Atualizar matriz de cobertura apenas para operações realmente implementadas e verificadas; registrar limitações de ambiente e testes que não puderem ser executados. Entregar diff revisável sem publicar ou modificar backend fora do escopo.

## Conclusão de cada entrega

Revisar os critérios de aceite do domínio, executar seus testes e conferir interfaces da próxima tarefa. Commits pequenos por entrega são recomendados durante a implementação; não assumir que este plano já executou tarefas ou criou infraestrutura. Estas specs encerram a solicitação documental atual; implementação das telas é um trabalho posterior.
