# 01 — Inventário e lacunas

## Frontend atual

| Evidência | Funcionalidade existente | Lacuna concreta |
| --- | --- | --- |
| [`app/page.tsx`](../app/page.tsx) | Página pública com links de entrada e cadastro | Não há entrada para área autenticada nem conteúdo da conta |
| [`app/actions/login.ts`](../app/actions/login.ts) | Validação básica e `POST /auth/login` | Descarta corpo/tokens, redireciona para `/`, não persiste sessão, não trata falha de rede |
| [`app/actions/register.ts`](../app/actions/register.ts) | Validação, confirmação de senha e `POST /users` | Aceita senha de seis caracteres; API exige oito; redireciona sem autenticar; erros genéricos |
| [`register-form.tsx`](<../app/(auth)/register/register-form.tsx>) | Formulário e estado pending | Texto de seis caracteres e ausência de limites máximos do contrato |
| [`lib/types.ts`](../lib/types.ts) | Estados de login/cadastro | Faltam DTOs de conteúdo, erros HTTP, estado de sessão e página de registros |
| [`app/components/ui/input.tsx`](../app/components/ui/input.tsx) | Label, `aria-invalid`, erro visual | Erro precisa ser associado ao input por `aria-describedby`; faltam textarea/select/checkbox |
| [`app/layout.tsx`](../app/layout.tsx) | Layout global | `lang="en"` com produto em português; metadata ainda é de scaffold |
| [`package.json`](../package.json) | Next 16.3.0, React 19.2.8, TS, Tailwind 4 e lint | Não há scripts ou dependências de testes no frontend |

As duas actions têm URLs de produção fixas. Não foram encontrados outros `fetch`, tratamento de cookies, envio de `Authorization`, cliente HTTP ou armazenamento de sessão em `app/` e `lib/`.

## Identidade e infraestrutura

`Parcial` significa que existe formulário/chamada, mas o fluxo não satisfaz o contrato completo. Todas as demais operações abaixo estão ausentes no frontend.

| ID | Método e endpoint | Acesso / sucesso | Responsável na API | Frontend / spec |
| --- | --- | --- | --- | --- |
| ID-01 | `POST /users` | Público / 201 `{id}` | `UserController.create` → `CreateUserUseCase.execute` | Parcial / [04](04-identidade.md) |
| ID-02 | `POST /auth/login` | Público / 200 `TokenPair` | `AuthenticationController.login` → `LoginUseCase.execute` | Parcial / [03](03-integracao-e-sessao.md), [04](04-identidade.md) |
| ID-03 | `POST /auth/refresh` | Público com refresh no body / 200 `TokenPair` | `AuthenticationController.refresh` → `RefreshAccessTokenUseCase.execute` | Ausente / [03](03-integracao-e-sessao.md) |
| ID-04 | `POST /auth/logout` | Bearer / 204 | `AuthenticationController.logout` → `TokenServiceContract.revokeSession` | Ausente / [04](04-identidade.md) |
| ID-05 | `DELETE /users/me` | Bearer e senha / 204 | `UserController.delete` → `DeleteUserUseCase.execute` | Ausente / [04](04-identidade.md) |
| OPS-01 | `GET /health/ready` | Público / 200 `{status:"ready"}` ou 503 | `HealthController.ready` | Operacional / [09](09-validacao-e-dependencias.md) |

Casos de uso: cadastro normaliza e-mail, verifica duplicidade, calcula hash e retorna apenas ID; login verifica senha e cria sessão; refresh delega a rotação dos tokens; exclusão verifica senha e remove a conta. Logout delega diretamente ao serviço de tokens, sem classe própria de use case.

Evidências: [controller de autenticação](../../generic-roleplay-api/src/modules/identity/presentation/http/controllers/authentication.controller.ts), [controller de usuários](../../generic-roleplay-api/src/modules/identity/presentation/http/controllers/user.controller.ts), [cadastro](../../generic-roleplay-api/src/modules/identity/application/usecases/create-user.use-case.ts), [login](../../generic-roleplay-api/src/modules/identity/application/usecases/login.use-case.ts), [refresh](../../generic-roleplay-api/src/modules/identity/application/usecases/refresh-access-token.use-case.ts), [exclusão](../../generic-roleplay-api/src/modules/identity/application/usecases/delete-user.use-case.ts), [readiness](../../generic-roleplay-api/src/modules/shared/presentation/controllers/health.controller.ts).

## Conteúdo de RPG

Todas as operações exigem Bearer. Criação retorna 201 com entidade, leituras e PATCH retornam 200, DELETE retorna 204 sem corpo. Os serviços de aplicação abaixo desempenham o papel de casos de uso; não há classes `*.use-case.ts` para conteúdo.

| ID | Método e endpoint | Controller → serviço | Frontend / spec |
| --- | --- | --- | --- |
| SYS-01 | `POST /rpg-systems` | `SystemsController.create` → `SystemsService.create` | Ausente / [05](05-sistemas-e-colecoes.md) |
| SYS-02 | `GET /rpg-systems` | `SystemsController.list` → `SystemsService.list` | Ausente / [05](05-sistemas-e-colecoes.md) |
| SYS-03 | `GET /rpg-systems/:systemId` | `SystemsController.get` → `SystemsService.get` | Ausente / [05](05-sistemas-e-colecoes.md) |
| SYS-04 | `PATCH /rpg-systems/:systemId` | `SystemsController.update` → `SystemsService.update` | Ausente / [05](05-sistemas-e-colecoes.md) |
| SYS-05 | `DELETE /rpg-systems/:systemId` | `SystemsController.delete` → `SystemsService.delete` | Ausente / [05](05-sistemas-e-colecoes.md) |
| COL-01 | `POST /rpg-systems/:systemId/collections` | `CollectionsController.create` → `CollectionsService.create` | Ausente / [05](05-sistemas-e-colecoes.md) |
| COL-02 | `GET /rpg-systems/:systemId/collections` | `CollectionsController.list` → `CollectionsService.list` | Ausente / [05](05-sistemas-e-colecoes.md) |
| COL-03 | `GET /rpg-collections/:collectionId` | `CollectionsController.get` → `CollectionsService.get` | Ausente / [05](05-sistemas-e-colecoes.md) |
| COL-04 | `PATCH /rpg-collections/:collectionId` | `CollectionsController.update` → `CollectionsService.update` | Ausente / [05](05-sistemas-e-colecoes.md) |
| COL-05 | `DELETE /rpg-collections/:collectionId` | `CollectionsController.delete` → `CollectionsService.delete` | Ausente / [05](05-sistemas-e-colecoes.md) |
| TPL-01 | `POST /rpg-collections/:collectionId/templates` | `TemplatesController.create` → `TemplatesService.create` | Ausente / [06](06-templates.md) |
| TPL-02 | `GET /rpg-collections/:collectionId/templates` | `TemplatesController.list` → `TemplatesService.list` | Ausente / [06](06-templates.md) |
| TPL-03 | `GET /rpg-templates/:templateId` | `TemplatesController.get` → `TemplatesService.get` | Ausente / [06](06-templates.md) |
| TPL-04 | `PATCH /rpg-templates/:templateId` | `TemplatesController.update` → `TemplatesService.update` | Ausente / [06](06-templates.md) |
| TPL-05 | `DELETE /rpg-templates/:templateId` | `TemplatesController.delete` → `TemplatesService.delete` | Ausente / [06](06-templates.md) |
| REC-01 | `POST /rpg-templates/:templateId/records` | `RecordsController.create` → `RecordsService.create` | Ausente / [07](07-registros.md) |
| REC-02 | `GET /rpg-templates/:templateId/records` | `RecordsController.list` → `RecordsService.list` | Ausente / [07](07-registros.md) |
| REC-03 | `GET /rpg-records/:recordId` | `RecordsController.get` → `RecordsService.get` | Ausente / [07](07-registros.md) |
| REC-04 | `PATCH /rpg-records/:recordId` | `RecordsController.update` → `RecordsService.update` | Ausente / [07](07-registros.md) |
| REC-05 | `DELETE /rpg-records/:recordId` | `RecordsController.delete` → `RecordsService.delete` | Ausente / [07](07-registros.md) |

Evidências: [sistemas](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/systems.controller.ts), [coleções](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/collections.controller.ts), [templates](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/templates.controller.ts), [registros](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/records.controller.ts); serviços [SystemsService](../../generic-roleplay-api/src/modules/rpg-content/application/systems.service.ts), [CollectionsService](../../generic-roleplay-api/src/modules/rpg-content/application/collections.service.ts), [TemplatesService](../../generic-roleplay-api/src/modules/rpg-content/application/templates.service.ts) e [RecordsService](../../generic-roleplay-api/src/modules/rpg-content/application/records.service.ts).

Os serviços encaminham operações para repositórios que aplicam ownership, limites, unicidade, validação dinâmica e transações. As specs também consideram o [repositório de conteúdo](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/drizzle-content.repository.ts) e o [repositório de registros](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/drizzle-records.repository.ts), pois as regras não estão todas nos controllers.

## Priorização

| Prioridade | Entrega | Motivo |
| --- | --- | --- |
| P0 | Cliente HTTP configurável, sessão, rotação serializada e identidade corrigida | Pré-requisito de todas as operações privadas |
| P1 | Sistemas e coleções | Estabelece hierarquia e navegação |
| P1 | Templates e editor de campos | Define o contrato dos formulários de registros |
| P1 | Registros e paginação | Completa o uso do conteúdo de RPG |
| Em cada entrega | Estados de UI, acessibilidade e validação | Critérios de conclusão da própria funcionalidade |

Não há GET/PATCH de perfil, listagem global de registros, busca, ordenação configurável, contagem total de registros, compartilhamento, transferência entre pais ou recuperação de senha. Essas ausências são limites do backend, não tarefas implementáveis apenas com telas.
