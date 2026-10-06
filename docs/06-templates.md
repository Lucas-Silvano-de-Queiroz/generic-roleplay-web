# 06 — Templates e editor de campos

**Cobertura:** TPL-01 a TPL-05. Depende de coleção existente, sessão e contratos da [02](02-contratos-da-api.md). Template define a estrutura textual dos registros; `category` é apenas metadado livre.

## Rotas propostas

| Rota | Operação | Interface |
| --- | --- | --- |
| `/collections/[collectionId]/templates/new` | GET coleção; POST templates da coleção | Metadados e editor de campos |
| `/templates/[templateId]` | GET template; GET coleção/sistema; GET primeira página de registros | Definição dos campos, lista de registros e ações |
| `/templates/[templateId]/edit` | GET template; PATCH template | Edição de metadados e schema |

Lista de templates vive no detalhe da coleção. Exibir nome, identifier e categoria quando preenchida; campo category não é enum nem determina um formulário específico. Breadcrumb: sistemas → sistema → coleção → template. Detalhe mostra campos na ordem persistida e link “Criar registro”.

## Metadados

Nome/descrição/identifier seguem [02](02-contratos-da-api.md). Category é input opcional de até 64 unidades UTF-16. POST não envia `collectionId` no body; PATCH não muda pai. Nomes podem repetir; identifier é único na coleção e alterável explicitamente.

POST 201 navega para o template criado e atualiza coleção. PATCH 200 usa resposta como estado salvo, atualiza detalhe/coleção e descarta rascunho apenas em sucesso. 409 de identifier marca o campo; 409 de quota informa máximo de 100 templates na coleção.

## Editor ordenado de campos

Cada linha/cartão tem:

| Controle | Payload | Comportamento |
| --- | --- | --- |
| Chave técnica | `key` | Obrigatória, 1–64, regex de identifier, única dentro do template |
| Rótulo | `label` | Obrigatório, máximo bruto 100, trim e mínimo 1 |
| Ajuda | `description` | Opcional, até 1000; textarea |
| Obrigatório | `required` | Checkbox, padrão false |
| Limite de texto | `maxLength` | Inteiro 1–100000; vazio omite propriedade; zero não significa ilimitado |
| Apresentação | `format` | Select: Texto / Texto longo; valores `text` / `textarea` |

Adicionar começa com key/label vazios, required false, format text. Mostrar erros sem bloquear a digitação; salvar exige definição válida. Máximo de 100 linhas. Array vazio é válido e tem estado “Este template ainda não possui campos.”. Não exigir campo `name` nem fixar schema por category.

Fornecer ações “Mover para cima”, “Mover para baixo” e “Remover” acessíveis por teclado. Na primeira entrega esses botões são suficientes; drag-and-drop não é necessário. A identidade interna de uma linha é um ID de UI estável, independente de `key`, e nunca é enviada à API.

Ao remover campo, pedir confirmação contextual se já houver registros conhecidos ou edição de template existente; não afirmar que a remoção apagará valores automaticamente. Remover definição sem compatibilidade pode ser rejeitado. Ao mudar key avisar que isso altera a estrutura, sem oferecer migração automática.

Contador de campos e de tamanho do JSON; erros de `fields.<index>.<property>` devem ser associados à linha correspondente ao payload enviado. Manter snapshot do envio durante pending e impedir reordenação simultânea para não deslocar erros de índice para outra linha.

## PATCH e compatibilidade com registros

- Só editar metadados: omitir `fields` inteiramente, preservando schema.
- Editar algum campo, propriedade ou ordem: enviar array completo, sem IDs de UI; preservar todas as definições ainda existentes.
- Array `[]` não é um default de PATCH; é uma remoção explícita de todos os campos. Enviar apenas uma linha substitui todas as outras.
- A API verifica todos os registros em transação. Se qualquer um ficar inválido, retorna 409 `Template change would invalidate existing records` e faz rollback integral, inclusive metadados enviados na mesma operação.
- Não truncar, preencher, migrar keys ou apagar valores para contornar conflito. O frontend deve manter o rascunho e explicar que a mudança requer ajustar os registros ou revisar a definição.
- O erro 409 não informa IDs/quantidades dos registros incompatíveis. Mostrar link para o detalhe/lista do template e ação explícita “Recarregar versão salva”; não inventar relatório de migração.

| Mudança | Comportamento confirmado / condição |
| --- | --- |
| Nome, descrição, category, identifier | Pode mudar sem validar novamente valores, respeitando limites e unicidade |
| Label, ajuda, format, reordenação | Permitido se a nova definição satisfizer os registros; formato não transforma strings |
| Acrescentar campo opcional | Permitido; não preenche os registros existentes |
| Acrescentar campo obrigatório | Rejeitado se qualquer registro não possuir valor não vazio para a key |
| Tornar campo obrigatório | Permitido somente se todos os registros satisfizerem a obrigação |
| Reduzir maxLength | Rejeitado se algum valor ultrapassar o novo limite |
| Remover campo/key ou renomear key | Rejeitado se valores existentes virarem keys desconhecidas |
| Remover campo nunca preenchido | Permitido se os registros continuarem válidos |

Não prometer pré-validação completa do frontend com uma única página de registros. A API valida todos, inclusive registros fora da página carregada. Não há endpoint de simulação, migração ou alteração em lote.

## Exclusão

No detalhe, confirmação: “Excluir este template também remove todos os seus registros. Esta ação não pode ser desfeita.”. Mostrar nome e botão cancelar. DELETE 204 volta para `/collections/<collectionId>` e atualiza coleção; páginas de registros descendentes ficam indisponíveis. Em falha manter diálogo/estado e não remover antecipadamente a lista. 404 segue tratamento de alvo já indisponível da spec 05.

## Critérios de aceite

- T-A01: criar template sem category e com `fields: []`; recarga mantém estado vazio e permite registro com `values: {}`.
- T-A02: defaults de required/format, 100 campos válidos, 101 inválidos, key repetida, maxLength zero/fracionário e formato desconhecido são exercitados.
- T-A03: reordenar com teclado persiste ordem; IDs de UI não vão no payload; erro `fields.0.key` marca a linha enviada.
- T-A04: PATCH apenas de nome não envia fields; edição de uma linha preserva as demais no array enviado; limpeza de maxLength omite só essa propriedade da definição completa.
- T-A05: registro com texto de 20 unidades UTF-16 e redução para maxLength 10 recebe conflito, mantém rascunho e não muda metadados/timestamps persistidos.
- T-A06: renomear key preenchida falha sem apagar valores; novo campo opcional passa; campo obrigatório sem valores existentes falha.
- T-A07: duplicidade de identifier, quota, conflito de schema e 413 têm mensagens distintas. Em 409 desconhecido usar mensagem geral.
- T-A08: excluir template confirma cascata, volta à coleção e elimina estado de registros; cancelar não chama a API.

Evidências: [controller](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/templates.controller.ts), [schemas](../../generic-roleplay-api/src/modules/rpg-content/domain/content.schemas.ts), [validação transacional](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/drizzle-content.repository.ts), [testes de compatibilidade e corrida](../../generic-roleplay-api/test/integration/rpg-template-records.integration-spec.ts).
