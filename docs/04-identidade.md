# 04 — Cadastro, login e conta

**Cobertura:** ID-01, ID-02, ID-04 e ID-05. ID-03 é comportamento interno em [03](03-integracao-e-sessao.md). Fluxos propostos sobre formulários já existentes.

## Cadastro — `/register`

Modificar `app/actions/register.ts` e `app/(auth)/register/register-form.tsx`. Manter nome, e-mail, senha e confirmação, estado pending e erros por campo.

- Validar limites exatos de [02](02-contratos-da-api.md) no servidor; mudar texto e validação de seis para oito caracteres. Nome da conta conta pontos de código após trim, respeitando também o teto de entrada bruta. Nunca truncar senha.
- Enviar apenas `{name, email, password}` para `POST /users`; não enviar confirmação.
- Em 201 validar `{id}` e redirecionar para `/login?registered=1`, exibindo “Conta criada. Entre para continuar.”. Cadastro não cria sessão; não ir para área privada nem adicionar login automático nesta entrega.
- Em 409 associar erro ao e-mail. Em 400 associar detalhes; em 429 mostrar espera; em 503/rede preservar dados não sensíveis e permitir tentativa consciente. Não ecoar senha ou confirmação em estado de action.
- Em pending bloquear envio repetido. Não transformar erro de rede em sucesso nem repetir o cadastro automaticamente.

## Login — `/login`

Modificar `app/actions/login.ts` e `app/(auth)/login/login-form.tsx`.

- Validar e-mail e senha de 1–1024 unidades UTF-16. Não aplicar trim à senha nem exigir oito no login.
- Enviar `POST /auth/login` e validar `TokenPair`. Criar sessão web antes de redirecionar para destino interno validado, default `/systems`.
- Se a API autenticar mas a criação do cookie falhar, não exibir sucesso: tentar revogar o refresh token recém-emitido uma única vez, sem registrar tokens, e exibir indisponibilidade.
- 401 indica credenciais inválidas. 400 e 429 têm tratamento específico; falhas operacionais não devem aparecer como “senha incorreta”.
- Preservar e-mail em erro; não retornar senha. Pessoa já autenticada que abre login/cadastro vai para `/systems` após verificação da sessão.
- Aviso `registered=1` não comprova existência de conta; serve apenas como mensagem de interface.

## Logout — shell autenticado

Criar `app/actions/logout.ts` e botão “Sair” no shell.

- Enviar o refresh token atual no corpo de `POST /auth/logout`; não é necessário renovar nem enviar access token. Sucesso 204 revoga esse refresh, apaga o cookie e navega para `/login`; access tokens já emitidos expiram normalmente.
- Sessão comprovadamente revogada/expirada pode ser removida localmente como saída concluída. Invalidar sessão web impede que refresh em voo a recrie.
- Rede/429/503 não comprovam revogação remota. Remover acesso local e cookie mesmo nesses casos, navegar para login e mostrar “Você saiu deste navegador. Não foi possível confirmar o encerramento da sessão no servidor.”. Não afirmar revogação remota. Preservar internamente apenas o status diagnóstico, sem expor token.
- Não enviar senha; nunca executar logout por GET. Limpar dados privados em estado do cliente e impedir acesso com botão voltar sem nova validação.

## Conta — `/settings/account`

Criar página autenticada, `app/actions/account.ts` e formulário de exclusão. A API não tem GET de perfil; a tela mostra configurações e zona de exclusão, sem inventar carregamento de nome/e-mail.

Texto obrigatório antes da confirmação: “Excluir sua conta remove todos os seus sistemas, coleções, templates e registros. Esta ação não pode ser desfeita.”. Exigir senha atual e uma confirmação explícita “Quero excluir minha conta”. Essa confirmação é estado de UI, não propriedade da API.

- Validar senha de 8–1024 unidades UTF-16. Enviar `DELETE /users/me` com `{password}` e Bearer somente após confirmação.
- Garantir access token atual antes da requisição. Em 401 `Invalid credentials`, marcar senha incorreta e preservar a sessão; o use case já alcançou a validação de senha. Não renovar nem repetir essa tentativa.
- Em 401 `Unauthorized`, permitir uma recuperação de token conforme 03; se falhar, pedir login. 401 sem mensagem reconhecida usa aviso de falha de confirmação, sem apagar uma sessão válida nem repetir a exclusão cegamente.
- 204: encerrar sessão web, apagar cookie, limpar dados privados e ir para `/login?deleted=1`, com “Conta excluída.”.
- 404 de usuário ausente: encerrar sessão local e solicitar login; não afirmar que esta tentativa excluiu a conta. A exclusão remove os refresh tokens; um access token ainda válido pode alcançar o use case e receber 404.
- 400/429/503/rede: conservar tela, explicar erro, não limpar conteúdo antes de sucesso. Em resultado desconhecido, confirmar estado por nova autenticação antes de afirmar exclusão; não repetir automaticamente a mutação.

## Critérios de aceite

- ID-A01: senha de sete caracteres falha no cadastro antes do fetch; oito passa; 1025 falha; texto visual informa oito.
- ID-A02: nome `"😀"` repetido 255 vezes é válido no cadastro; 256 é inválido, sem aplicar maxlength de 255 unidades UTF-16 ao nome bruto.
- ID-A03: cadastro 201 vai para login e não cria sessão; 409 aparece no e-mail; confirmação nunca chega à API.
- ID-A04: login persiste tokens apenas no servidor; redirect não é engolido pelo tratamento de rede; recarga abre `/systems`.
- ID-A05: bloqueio 429 respeita segundos recebidos; mensagem de indisponibilidade difere de credenciais inválidas.
- ID-A06: logout 204 invalida sessão; falha remota ainda encerra acesso local e usa a mensagem qualificada acima.
- ID-A07: exclusão exige senha e confirmação; senha incorreta não desloga; 204 limpa sessão/conteúdo e todas as rotas privadas voltam a exigir login.
- ID-A08: nenhuma action inclui senha, confirmação ou tokens em resultados serializados/logs.

Evidências: [schemas dos DTOs](../../generic-roleplay-api/src/modules/identity/presentation/http/dto/create-user.dto.ts), [limites e Unicode](../../generic-roleplay-api/src/modules/identity/presentation/http/dto/input-limits.spec.ts), [use case de exclusão](../../generic-roleplay-api/src/modules/identity/application/usecases/delete-user.use-case.ts), [erros de credenciais](../../generic-roleplay-api/src/modules/identity/application/errors/invalid-credentials.error.ts), [controller de logout](../../generic-roleplay-api/src/modules/identity/presentation/http/controllers/authentication.controller.ts).
