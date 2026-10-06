# 02 — Contratos da API

Contratos atuais extraídos do código local. Tipos abaixo representam JSON no frontend: datas são strings ISO 8601, não instâncias de `Date`. IDs são UUIDs; URLs de detalhe usam ID, nunca `identifier`.

## Tipos para `lib/api/contracts.ts` (arquivo proposto)

```ts
export type UUID = string;
export type IsoDate = string;
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};
export type ApiErrorBody = {
  statusCode: number;
  message: string;
  details?: Array<{ field: string; message: string }>;
};
export type RpgSystem = {
  id: UUID;
  name: string;
  description?: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
};
export type RpgCollection = RpgSystem & {
  systemId: UUID;
  identifier: string;
};
export type FieldDefinition = {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  maxLength?: number;
  format: "text" | "textarea";
};
export type RpgTemplate = RpgSystem & {
  collectionId: UUID;
  identifier: string;
  category?: string;
  fields: FieldDefinition[];
};
export type RecordValues = Record<string, string>;
export type RpgRecord = {
  id: UUID;
  templateId: UUID;
  values: RecordValues;
  createdAt: IsoDate;
  updatedAt: IsoDate;
};
export type RecordPage = { items: RpgRecord[]; nextCursor?: UUID };
export type CreateSystem = { name: string; description?: string };
export type UpdateSystem = Partial<CreateSystem>;
export type CreateCollection = CreateSystem & { identifier: string };
export type UpdateCollection = Partial<CreateCollection>;
export type FieldDefinitionInput = Omit<FieldDefinition, "required" | "format"> & {
  required?: boolean;
  format?: FieldDefinition["format"];
};
export type CreateTemplate = CreateCollection & {
  category?: string;
  fields?: FieldDefinitionInput[];
};
export type UpdateTemplate = Partial<CreateTemplate>;
export type CreateRecord = { values: RecordValues };
export type UpdateRecord = Partial<CreateRecord>;
export type ListRecordsQuery = { limit?: number; cursor?: UUID };
```

Os tipos não validam runtime. Validar dados externos antes de usar e separar contratos de API dos estados de formulário. `undefined` corresponde a propriedade omitida no JSON; `null` não é um mecanismo de limpeza.

O frontend mantém `TokenPair` como tipo interno e extrai os tokens dos cookies `Set-Cookie` no runtime servidor; tokens não chegam como JSON. Decoders de dados usam `decodeUserCreated(value: unknown): {id: UUID}`, `decodeSystem(value: unknown): RpgSystem`, `decodeCollection(value: unknown): RpgCollection`, `decodeTemplate(value: unknown): RpgTemplate`, `decodeRecord(value: unknown): RpgRecord` e `decodeRecordPage(value: unknown): RecordPage`. Listas usam `decodeSystemList`, `decodeCollectionList` e `decodeTemplateList`, recebendo unknown e retornando os arrays correspondentes. Verificar tipos, UUIDs, datas ISO, campos obrigatórios e estrutura conforme os contratos; lançar erro em resposta inválida. O cliente captura esse erro como `invalid-response`.

## Identidade

| Operação | Entrada | Resposta de sucesso |
| --- | --- | --- |
| Cadastro | `{name, email, password}` | 201 `{id}`; não retorna tokens |
| Login | `{email, password}` | 204 + cookies HttpOnly de access/refresh; sem TokenPair JSON |
| Refresh | Cookie HttpOnly de refresh | 204 + substituição dos cookies de access/refresh |
| Logout | Cookie HttpOnly de refresh; dispensa access | 204; revoga o refresh e limpa cookies |
| Excluir conta | `{password}` + cookie HttpOnly de access | 204; refresh tokens/conteúdo são removidos; access tokens expiram normalmente |

| Campo | Regra atual |
| --- | --- |
| `name` de usuário | Entrada até 1024 unidades UTF-16; após trim, 1–255 pontos de código (`Array.from(name).length`) |
| `email` | Entrada até 512 unidades UTF-16; trim + lowercase; até 255 após normalização; e-mail válido |
| `password` de cadastro/exclusão | 8–1024 unidades UTF-16; não aplicar trim nem truncar |
| `password` de login | 1–1024 unidades UTF-16; não impor o mínimo de cadastro ao login |
| `refreshToken` | Cookie HttpOnly; valor entre 1–4096 unidades UTF-16 |

`confirmPassword` só existe na UI e nunca deve ser enviado. Os cookies de auth são recebidos do Nest pelo servidor Next e substituídos por um cookie de sessão cifrado próprio; o browser nunca recebe os cookies do Nest. Os schemas de identidade usam `z.object`, que remove propriedades desconhecidas; conteúdo usa schemas estritos que as rejeitam. A UI deve construir payloads explícitos nos dois casos.

## Conteúdo

| Campo / regra | Contrato atual |
| --- | --- |
| `name` de sistema/coleção/template e `label` de campo | Máximo bruto de 100 unidades UTF-16, depois trim, mínimo de 1 |
| `description` de entidade | Opcional; até 5000 unidades UTF-16; espaços preservados |
| `identifier` e `key` | 1–64 caracteres ASCII; regex `^[a-z][a-z0-9_-]*$`; sem trim/lowercase automático |
| `category` de template | Opcional; texto livre até 64 unidades UTF-16; pode ser `""` |
| `description` de campo | Opcional; até 1000 unidades UTF-16 |
| `required` | Boolean; padrão de criação `false` |
| `maxLength` | Opcional; inteiro de 1 a 100000; vazio na UI deve omitir a propriedade |
| `format` | `text` ou `textarea`; padrão `text` |
| `fields` | Array ordenado de 0–100 campos, keys únicas; padrão de criação `[]` |
| `values` | Objeto string → string; só keys definidas no template; cada valor até 100000 unidades UTF-16 e respeitando `maxLength` |
| Campo obrigatório de registro | Propriedade própria presente, string cujo `trim().length > 0`; trim serve para validar, não transformar o valor |
| Quantidades | Até 100 coleções por sistema, 100 templates por coleção, 1000 registros por template; não foi encontrado limite de sistemas por conta |
| Payload total | Até 100 KiB (102400 bytes) de JSON; limite global pode impedir valores que isoladamente respeitam `maxLength` |

Contar limites UTF-16 com `.length`, conforme Zod e validação dinâmica. Exemplo: `"😀".length === 2`. O nome da conta tem regra diferente e conta pontos de código. O tamanho do body é UTF-8 de `JSON.stringify(payload)`, incluindo chaves, aspas e escapes.

Unicidade é do identifier dentro do pai: coleção dentro do sistema; template dentro da coleção. Nomes podem repetir. Renomear `name` não altera `identifier`; o identifier pode ser alterado explicitamente por PATCH. Sistemas não possuem identifier. Registros não possuem propriedade `name`: um eventual nome fica em `values` se o template definir esse campo.

## PATCH e limpeza

- PATCH vazio ou semanticamente igual preserva `updatedAt`; `createdAt` é preservado em qualquer edição.
- `fields` omitido preserva o schema do template; enviado substitui **todo** o array, inclusive ordem e metadados. `fields: []` remove todos os campos se isso não invalidar registros.
- `values` omitido preserva o registro; enviado substitui **todo** o objeto. Campos opcionais ausentes nessa substituição são removidos.
- `description: ""` e `category: ""` limpam visualmente textos; omitir no PATCH preserva o valor anterior. `null` é rejeitado.
- Remover `description`/`maxLength` de um campo exige enviar a definição completa de `fields` sem essa propriedade.
- Não enviar IDs, pai, proprietário, datas ou campos de UI no body. Mover uma entidade para outro pai não é suportado.

## Listas e paginação

Sistemas, coleções e templates retornam arrays sem envelope e sem paginação, em ordem crescente de ID. Registros retornam `{items, nextCursor?}`, em ordem crescente de ID, com `limit` padrão 50, mínimo 1 e máximo 100. `nextCursor` só existe quando há próxima página; não há `total` ou `hasMore`.

Serializar `limit` como inteiro decimal na URL. O endpoint de registros aceita somente `limit` e `cursor` UUID. Query desconhecida, query repetida, `1.5`, `1e1`, zero ou 101 são inválidos. Um cursor é apenas um limite de ID no template autorizado; não precisa corresponder a um registro ainda existente. Não inventar busca, página numérica ou ordenação no servidor.

## Erros e mensagens de UI propostas

Formato: `{statusCode, message, details?}`. O filtro uniformiza `400` como `Validation failed`; `details` pode faltar. Campos podem ter caminhos como `fields.0.key`, `values.name` ou `""` para erro geral. A regex de key não permite pontos; os caminhos `values.<key>` são inequívocos.

| Resposta | Tratamento proposto |
| --- | --- |
| 400 | Associar detalhes aos campos conhecidos; detalhes sem destino viram resumo do formulário; preservar entradas |
| 401 em login | “E-mail ou senha incorretos.”; não revelar qual credencial falhou |
| 401 em rota privada | Recuperar sessão conforme [03](03-integracao-e-sessao.md); exceção de senha incorreta na exclusão em [04](04-identidade.md) |
| 404 em conteúdo | “Recurso não encontrado.”; comportamento igual para inexistente e de outra conta |
| 409 `User already exists` | “Este e-mail já está cadastrado.” |
| 409 `Collection identifier already exists` / `Template identifier already exists` | Erro no identifier: “Este identificador já está em uso.” |
| 409 `Collection limit reached` / `Template limit reached` / `Record limit reached` | Informar limite da entidade e atualizar a lista; preservar formulário |
| 409 `Template change would invalidate existing records` | Conflito de schema; manter rascunho e orientar ajuste dos registros |
| 409 não reconhecido | Mensagem geral de conflito; nunca afirmar que salvou |
| 413 | “O conteúdo excede o tamanho permitido. Reduza os textos para continuar.”; sem truncamento |
| 429 | Informar bloqueio temporário e respeitar `Retry-After` em segundos; sem repetir automaticamente |
| 500 / 503 / rede / timeout / resposta inválida | Mensagem de indisponibilidade, preservar entradas e permitir nova tentativa consciente |

Guardar `X-Request-Id` como referência de diagnóstico, sem guardar tokens, senha ou valores privados nos logs. A API manda `Cache-Control: no-store`. Falhas intermediárias podem retornar HTML: o cliente não deve depender de todo erro ter JSON válido.

## Exemplos válidos da jornada

```json
{"name":"Meu sistema","description":"Regras da mesa"}
```

```json
{"name":"Magias","identifier":"spells"}
```

```json
{
  "name":"Magia",
  "identifier":"spell",
  "category":"magia",
  "fields":[
    {"key":"name","label":"Nome","required":true,"maxLength":100,"format":"text"},
    {"key":"description","label":"Descrição","required":false,"format":"textarea"}
  ]
}
```

```json
{"values":{"name":"  Amizade  ","description":"Material: visco\n\n✨"}}
```

Esses quatro bodies correspondem, em ordem, a criação de sistema, coleção, template e registro. IDs de pai vão no path. Espaços, quebras de linha e Unicode do registro devem permanecer literais.

Evidências: [schemas de identidade](../../generic-roleplay-api/src/modules/identity/presentation/http/dto/identity-input.schemas.ts), DTOs de [cadastro](../../generic-roleplay-api/src/modules/identity/presentation/http/dto/create-user.dto.ts), [login](../../generic-roleplay-api/src/modules/identity/presentation/http/dto/login.dto.ts), [exclusão](../../generic-roleplay-api/src/modules/identity/presentation/http/dto/delete-user.dto.ts), [conteúdo](../../generic-roleplay-api/src/modules/rpg-content/domain/content.schemas.ts), [registros](../../generic-roleplay-api/src/modules/rpg-content/domain/records.schemas.ts), [validação de valores](../../generic-roleplay-api/src/modules/rpg-content/domain/record-values.ts), [filtro de erros](../../generic-roleplay-api/src/modules/shared/presentation/filters/global-exception.filter.ts), [OpenAPI de conteúdo](../../generic-roleplay-api/src/modules/rpg-content/presentation/http/content.openapi.ts) e [testes HTTP de registros](../../generic-roleplay-api/test/e2e/rpg-records.e2e-spec.ts).
