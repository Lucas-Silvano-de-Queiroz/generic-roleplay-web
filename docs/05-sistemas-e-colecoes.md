# 05 — Sistemas e coleções

**Cobertura:** SYS-01 a SYS-05 e COL-01 a COL-05. Todas as telas e ações deste documento são propostas; dependem da integração/sessão da [03](03-integracao-e-sessao.md).

## Rotas e dados

| Rota de interface | Dados/ação | Conteúdo |
| --- | --- | --- |
| `/systems` | `GET /rpg-systems` | Lista privada de sistemas; CTA “Criar sistema” |
| `/systems/new` | `POST /rpg-systems` | Formulário de criação |
| `/systems/[systemId]` | GET sistema + GET coleções do sistema | Detalhe, lista de coleções, editar/excluir sistema, criar coleção |
| `/systems/[systemId]/edit` | GET + PATCH sistema | Editar nome/descrição |
| `/systems/[systemId]/collections/new` | GET sistema + POST coleção | Criar coleção no pai exibido |
| `/collections/[collectionId]` | GET coleção + GET sistema via `systemId` + GET templates | Breadcrumb, detalhe, lista de templates, editar/excluir coleção |
| `/collections/[collectionId]/edit` | GET coleção + PATCH coleção | Editar metadados |

Exclusões usam confirmação na página de detalhe; não precisam de rota própria. `/systems` é o destino autenticado inicial e cumpre o papel de painel, sem criar contagens ou agregações inexistentes na API.

Links de breadcrumb usam `/systems` → sistema → coleção. Resolver ancestral pelo ID retornado, não por um parâmetro de formulário. Leituras independentes após conhecer o pai podem ser paralelas; se o detalhe principal falhar, não renderizar lista como se o recurso estivesse vazio.

## Sistemas

- Formulário: `name` obrigatório, até 100 unidades UTF-16 brutas, com trim; `description` opcional até 5000, em textarea. Sem identifier, proprietário ou campos de regra adicionais.
- POST 201 navega para `/systems/<id>`, usando o ID da resposta. PATCH 200 volta ao detalhe e atualiza lista de sistemas.
- Na edição enviar só propriedades alteradas; descrição apagada envia `""`. Não enviar `{description: undefined}` esperando limpar.
- Mostrar nome, descrição se houver, datas de criação/edição e coleções. Renderizar descrição como texto seguro, preservando quebras de linha.
- Lista vazia: “Você ainda não criou sistemas.” + CTA. Nomes repetidos são válidos. Não impor limite de 100 sistemas nem enviar query de paginação/busca.
- DELETE confirma: “Excluir este sistema também remove todas as suas coleções, templates e registros. Esta ação não pode ser desfeita.”. Em 204 voltar para `/systems`; não manter descendentes em cache/estado.

## Coleções

- Formulário: nome e descrição nas mesmas regras do sistema; `identifier` obrigatório conforme [02](02-contratos-da-api.md). Mostrar ajuda “Comece com uma letra minúscula. Use letras minúsculas, números, _ ou -.”.
- Não derivar identifier automaticamente depois que a pessoa o editou. Para a primeira entrega, exigir preenchimento explícito, evitando transliteração e renomeação silenciosa.
- Criar com `POST /rpg-systems/<systemId>/collections`; retornar ao detalhe da coleção criada. O pai é fixo e não vai no body.
- Editar permite alterar identifier explicitamente. Alterar apenas nome preserva identifier. 409 de duplicidade fica no campo identifier, mantendo rascunho.
- A lista no sistema mostra nome e identifier; no detalhe da coleção mostrar descrição e lista de templates. Não há semântica obrigatória de “personagens”, “magias” ou outra categoria: qualquer coleção válida é aceita.
- Máximo de 100 coleções no sistema. Uma lista completa com 100 permite desabilitar criação e explicar limite; a resposta da API prevalece em concorrência. Não tratar quota como erro de identifier.
- DELETE confirma: “Excluir esta coleção também remove todos os seus templates e registros. Esta ação não pode ser desfeita.”. Em 204 ir para `/systems/<systemId>` e atualizar o pai.

## Estados comuns

Loading com indicação de carregamento; lista vazia com CTA; erro de serviço com tentativa explícita; 404 com “Recurso não encontrado.” e link para sistemas. Recurso de outra conta recebe o mesmo estado de inexistente. POST/PATCH mantém formulário aberto em falha, bloqueia duplo envio e sinaliza sucesso apenas após resposta válida.

Confirmação de exclusão deve mostrar nome do alvo, botão “Cancelar” e botão destrutivo “Excluir”. Não apresentar números exatos de descendentes sem dados para calculá-los. Em 404 na exclusão informar recurso indisponível, atualizar pai e remover item obsoleto; não afirmar exclusão por esta requisição.

PATCH vazio não precisa de chamada: botão salvar desabilitado sem alteração. Se enviado, API devolve o recurso sem mudar datas. Não prometer controle de versão: o contrato não oferece ETag, `If-Match` ou `expectedUpdatedAt`; edições concorrentes podem sobrescrever valores.

## Critérios de aceite

- SC-01: criar sistema, recarregar detalhe, listar, editar, excluir; lista e detalhe refletem respostas reais e datas retornadas.
- SC-02: sistema sem coleções mostra vazio; sistema inexistente mostra 404, nunca vazio de coleções.
- SC-03: criar coleção no sistema A e navegar pelo breadcrumb; identifier duplicado em A falha, o mesmo identifier em B é permitido.
- SC-04: renomear coleção mantém identifier; alteração explícita válida de identifier funciona; tentativa com maiúscula/espaço/acento é rejeitada antes do envio.
- SC-05: limite 100, erro 409 por corrida, 413 e indisponibilidade preservam formulário e exibem mensagens distintas.
- SC-06: apagar descrição envia string vazia; PATCH igual não muda a data mostrada nem altera identifier.
- SC-07: cancelar confirmação não envia DELETE; confirmar 204 remove navegação/dados descendentes; 404 usa tratamento uniforme.
- SC-08: uma segunda conta não vê sistemas da primeira e recebe a mesma página 404 para IDs privados.

Evidências: [schemas](../../generic-roleplay-api/src/modules/rpg-content/domain/content.schemas.ts), [repositório e ordenação](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/drizzle-content.repository.ts), [ownership](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/content-ownership.ts), [cascatas](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/schema/rpg-content.schema.ts), [testes HTTP](../../generic-roleplay-api/test/e2e/rpg-content.e2e-spec.ts).
