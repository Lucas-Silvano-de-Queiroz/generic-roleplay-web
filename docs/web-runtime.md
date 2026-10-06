# Runtime do frontend

O frontend chama a API NestJS a partir do servidor Next. Configure `API_BASE_URL` e `WEB_SESSION_COOKIE_ENCRYPTION_KEY` a partir de `.env.example`; ambas são exclusivas do runtime servidor. O modo local aceita HTTP somente para `localhost`/`127.0.0.1`; os demais ambientes exigem HTTPS.

## Cookie de sessão

Gere a chave com `openssl rand -base64 32` e configure-a em `WEB_SESSION_COOKIE_ENCRYPTION_KEY`. Todas as instâncias Next precisam compartilhar a mesma chave. Ela cifra o access token e o refresh token com AES-256-GCM dentro de um cookie `HttpOnly`; o browser não consegue acessar seu conteúdo por JavaScript. Não versione nem exponha a chave como variável `NEXT_PUBLIC_*`. Trocar a chave invalida as sessões atuais.

O cookie mantém expiração absoluta de até quinze dias desde o login. `proxy.ts` renova o par da API quando o access token se aproxima da expiração e grava a versão cifrada na resposta. Cookies cifrados acima de 3800 bytes são rejeitados para respeitar limites dos navegadores/proxies. Não há banco nem job de limpeza de sessões no runtime Next.

## Desenvolvimento

Use portas distintas, por exemplo Next `3000` e API `3001`. Configure `API_BASE_URL`, chave de sessão e garanta que API/banco de teste tenham suas migrações aplicadas. Readiness da API, isoladamente, não garante que as tabelas de conteúdo RPG existam.

As chamadas de servidor usam `cache: "no-store"` e não dependem de CORS no navegador. As ações do Next têm limite de corpo compatível com os formulários; cada JSON enviado à API é limitado por `Buffer.byteLength(JSON.stringify(body), "utf8")` a 102400 bytes. Não aumente o limite da API para contornar um payload rejeitado.

## Operação distribuída

Todas as instâncias Next devem compartilhar a mesma chave de cifragem. O Nest valida access tokens localmente e persiste somente hashes de refresh tokens. Logout revoga o refresh recebido no corpo; access tokens continuam válidos até expirar. O refresh é de uso único: uma renovação concorrente vence, as demais recebem `401`; uma resposta perdida exige novo login. O frontend atual não coordena renovações concorrentes nem mantém store de sessões, portanto isso ainda pode encerrar o cookie local. Teste rate limits da API atrás do proxy antes de produção: chamadas de login chegam pelo IP da camada web; `X-Forwarded-For` enviado pelo navegador não deve ser repassado sem uma cadeia confiável na borda.
