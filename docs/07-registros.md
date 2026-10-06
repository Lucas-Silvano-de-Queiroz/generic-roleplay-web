# 07 — Registros e formulários dinâmicos

**Cobertura:** REC-01 a REC-05. Depende de template existente e integração da [03](03-integracao-e-sessao.md). Registros são instâncias preenchidas de um template e possuem apenas ID, templateId, values e datas.

## Rotas propostas

| Rota | Leituras / mutação | Interface |
| --- | --- | --- |
| `/templates/[templateId]` | GET template + GET records com limit 50 | Lista paginada, definição e CTA “Criar registro” |
| `/templates/[templateId]/records/new` | GET template; POST records | Formulário gerado a partir de fields |
| `/records/[recordId]` | GET record → GET template → ancestrais | Leitura dos valores, editar e excluir |
| `/records/[recordId]/edit` | GET record e template atual; PATCH record | Formulário preenchido, substituição completa |

IDs de ancestrais são resolvidos pelos DTOs: registro → templateId → collectionId → systemId. Breadcrumb aponta para template/lista. Não depender de query contendo definição ou pai enviado pelo cliente.

## Lista e paginação

- Primeira chamada `GET /rpg-templates/<id>/records?limit=50`. Mostrar itens na ordem retornada. Lista vazia só quando template carregou e `items` é vazio.
- Identificação proposta da linha: se o template declarar key `name` e o registro tiver valor não vazio, mostrar esse texto; caso contrário “Registro <id>”. Esse rótulo é visual, não cria propriedade nova nem modifica values. Texto longo pode ser abreviado visualmente sem truncar o dado.
- Mostrar datas, ação abrir e link criar. Não usar category para inferir campos ou exigir nomes únicos.
- Botão “Carregar mais” apenas se `nextCursor` existir; pedir exatamente esse cursor com mesmo limit. Acrescentar itens deduplicados por ID. Sem total de páginas ou total de registros: exibir “N registros carregados”.
- Botão pending bloqueia paginação repetida; falha na próxima página preserva itens já carregados e permite tentar de novo. Respostas atrasadas de outro template devem ser descartadas.
- Ao trocar template, criar/excluir registro ou pedir atualização da lista, reiniciar cursor e carregar a primeira página. Não reutilizar cursor de outro template nem derivar próximo cursor pela contagem.
- Cursores de itens apagados continuam válidos; paginação não é snapshot. Registros criados depois podem surgir em páginas seguintes, e a lista atualizada volta ao início.
- Não declarar que quota 1000 foi atingida por ter carregado uma página. Usar 409 da API ou uma lista totalmente carregada para informar limite. Não enviar `search`, `page`, `sort` ou filtros desconhecidos.

## Geração do formulário

Usar exclusivamente o template atual vindo do servidor. Ordem do formulário = ordem de `fields`. Para cada campo, mostrar label, indicação obrigatório, ajuda, erro e contador se houver limite.

| Format | Edição proposta | Leitura proposta |
| --- | --- | --- |
| `text` | Input de texto | Texto escapado |
| `textarea` | Textarea | Texto escapado com quebras de linha |

**Decisão de escopo:** somente texto simples e texto longo, sem preview ou renderização de conteúdo formatado. Salvar e exibir strings literais escapadas. Nunca usar `dangerouslySetInnerHTML` com values.

Todos os controles produzem strings. Não converter números, booleanos, espaços, emoji ou quebras de linha. Nunca aplicar trim a values no envio. Para validar required, usar presença própria e `trim().length > 0`; para limite, `.length` UTF-16. O máximo efetivo é `Math.min(field.maxLength ?? 100000, 100000)`.

Campo opcional diferencia **ausente** e **string vazia**. Controle proposto por campo opcional: “Incluir este campo”. Desmarcado omite a key; marcado inclui exatamente a string digitada, inclusive `""` ou espaços. Em edição iniciar marcado somente quando `Object.hasOwn(record.values, field.key)` for verdadeiro. Obrigatórios ficam sempre incluídos. Isso evita transformar valores ausentes em vazios ou apagar conteúdo silenciosamente.

Template sem campos aceita formulário vazio: aviso “Este template não possui campos. O registro será criado sem valores.” e envio explícito `{values:{}}`. Qualquer key em template vazio é inválida.

Construir values por allowlist de fields, como objeto sem protótipo ou via `Object.fromEntries`; não atribuir keys arbitrárias por mutação de um objeto comum. A regex exige letra inicial, rejeitando `__proto__`, mas permite `constructor` e `prototype`, que devem funcionar como keys próprias sem afetar protótipos. Não derivar identidade do componente apenas da posição da linha.

## Criação e edição

- POST envia `{values}` completo, sem name/templateId/datas no topo. Em 201 ir para `/records/<id>`, revalidando lista do template.
- PATCH com `values` substitui tudo. Carregar objeto inteiro do registro e todos os campos atuais; nunca mandar apenas o input alterado. Opcionais marcados preservam valores; desmarcar remove a key na substituição.
- Sem mudança, não precisa enviar PATCH. API aceita `{}` ou values iguais sem mudar updatedAt; não fabricar data nova no cliente.
- Antes de enviar, a action recarrega o template para validar keys e limites atuais. Se houver mudança de schema desde abertura, retornar conflito de formulário com aviso “A definição deste template mudou. Revise os campos antes de salvar.” e permitir revisão explícita. Não descartar valores locais de keys removidas: mantê-los no rascunho para cópia, mas não enviar como se fossem válidos.
- A API revalida sob lock o template atual. Corrida ainda pode gerar 400 de `values.<key>`; usar detalhes e oferecer recarregar definição mantendo rascunho. Não existe controle de versão que impeça duas pessoas/abas de sobrescrever o mesmo registro; evitar promessa de merge automático.
- Payload acima de 100 KiB falha antes da chamada, com orientação para reduzir texto. Mesmo abaixo disso, tratar 413 do ambiente. Não truncar valores para encaixar.
- Quota 409 informa máximo 1000 por template, mantendo o formulário. Nomes e valores repetidos são permitidos.

## Leitura e exclusão

Na leitura mostrar campos na ordem do template, todos escapados. Diferenciar valor ausente (“Não preenchido”) e vazio (“Vazio”). Mostrar metadados de criação/edição com data localizada. Não esconder registros sem `values.name`.

Confirmação de DELETE: “Excluir este registro? Esta ação não pode ser desfeita.”. Excluir registro remove só ele, preservando template e schema. Em 204 voltar ao template e reiniciar lista. 404 tem tratamento uniforme de alvo indisponível; falha operacional não remove item antecipadamente. Não chamar `.json()` no 204.

## Critérios de aceite

- R-A01: campos text/textarea, required/optional e array vazio geram formulários corretos sem schema por categoria.
- R-A02: `"  Amizade  "`, `"Material: visco\n\n✨"` e texto semelhante a HTML voltam literais após salvar e recarregar; HTML não executa.
- R-A03: required com espaços falha; opcional ausente não é enviado; opcional incluído vazio é enviado como `""`; desmarcar em edição remove a key.
- R-A04: editar um campo mantém os outros values; `{}`/igual não altera updatedAt; erro 400 fica na key correta.
- R-A05: `"😀"` tem comprimento 2; maxLength 1 rejeita. Tamanho UTF-8/escapes de todo body é medido sem truncamento.
- R-A06: com 51 registros, primeira página tem 50 e cursor, segunda tem um sem cursor; deduplicação, retry de página e troca de template mantêm listas corretas.
- R-A07: registro sem campo name tem rótulo por ID; duplicidade de values.name é permitida; key `constructor` é tratada como propriedade própria.
- R-A08: quota 1000, 413, template alterado e recurso privado geram estados apropriados preservando rascunho.
- R-A09: exclusão individual mantém template; exclusão do pai invalida detalhe de registro; sessão expirada segue 03.

Evidências: [controller](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/records.controller.ts), [schemas](../../generic-roleplay-api/src/modules/rpg-content/domain/records.schemas.ts), [validação dinâmica](../../generic-roleplay-api/src/modules/rpg-content/domain/record-values.ts), [repositório/paginação](../../generic-roleplay-api/src/modules/rpg-content/infrastructure/database/drizzle-records.repository.ts), [testes de valores](../../generic-roleplay-api/src/modules/rpg-content/domain/record-values.spec.ts) e [testes HTTP](../../generic-roleplay-api/test/e2e/rpg-records.e2e-spec.ts).
