# upMarvel — Upload Heroico

## Descrição

upMarvel é um Cloudflare Worker que serve uma UI de upload (single-file HTML embutido) e actua como proxy para uploads resumíveis (Resumable Upload) para Google Drive. Também fornece um explorador de ficheiros, pré-visualização e endpoints API que gerem sessões de upload, envio de blocos, listagem e descarregamento.

## Principais funcionalidades

- Interface web embutida (HTML/CSS/JS) servida pelo Worker.
- Upload em blocos (resumable) para Google Drive via sessão de upload resumível.
- Listagem de ficheiros no folder de destino no Drive e cache (env.FILE_CACHE).
- Download/proxy de ficheiros com passagem do body retornado pela API do Drive.
- Flow OAuth para obter REFRESH_TOKEN via /oauth/login → /oauth/callback.
- Endpoint para invalidar cache após upload concluído.

## Endpoints

- **GET /** 
  - Serve a página HTML com a UI de upload e explorador.
- **POST /start**
  - Inicia uma sessão de upload resumível. Body JSON: `{ "fileName": "...", "mimeType": "..." }`
  - Retorna: `{ success: true, uploadUrl: "<session-location>" }`
- **PUT /upload**
  - Recebe blocos do cliente e os envia para a session URL do Drive.
  - Headers esperados: `X-Upload-Url` (session URL), `Content-Range`
  - Retorna status do Google Drive (308 para continuidade, 200/201 quando concluído).
- **GET /files**
  - Retorna lista de ficheiros no folder `TARGET_FOLDER_ID`.
  - Usa cache (env.FILE_CACHE).
- **POST /invalidate-cache**
  - Limpa a entrada do cache usada pela listagem de ficheiros.
- **GET /download/:fileId**
  - Faz proxy do conteúdo do ficheiro do Drive (alt=media).
- **GET /oauth/login**
  - Redireciona para o consent screen do Google (para obter code).
- **GET /oauth/callback**
  - Endpoint usado para trocar code por refresh token (retorna página com refresh token).

## Variáveis de ambiente / bindings necessários

- `GOOGLE_CLIENT_ID` — ID do cliente OAuth.
- `GOOGLE_CLIENT_SECRET` — Secret do cliente OAuth.
- `REFRESH_TOKEN` — Refresh token obtido via fluxo OAuth (pode temporariamente ser `pendente`).
- `TARGET_FOLDER_ID` — ID da pasta do Google Drive onde os ficheiros serão guardados.
- `FILE_CACHE` — binding para um namespace KV (usado para cache da listagem).

## Como obter o REFRESH_TOKEN (resumido)

1. Defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente do Worker (ou wrangler).
2. Visite: `https://{seu-worker-domain}/oauth/login`
3. Conceda permissões; o Google redirecionará para `/oauth/callback` e esta rota exibirá o refresh token.
4. Copie o refresh token e configure a variável `REFRESH_TOKEN` no Worker.

## Fluxo de upload resumível (como o Worker funciona com a UI)

1. A UI cria uma entrada chamando `POST /start` com `fileName` e `mimeType`.
2. O Worker inicia uma sessão resumível junto à API do Drive (`uploadType=resumable`) e devolve o header `Location` (`uploadUrl`).
3. O cliente envia blocos `PUT` para `/upload` incluindo:
   - Header `X-Upload-Url`: a sessão (`uploadUrl`) fornecida pelo `/start`
   - Header `Content-Range`: `bytes <start>-<end>/<total>`
   - Body: o chunk de dados
4. O Worker repassa o `PUT` para o `uploadUrl` do Drive e retorna o status (308 para mais blocos, 200 quando concluído).
5. Após conclusão, o cliente pede `/invalidate-cache` e `/files` para atualizar a lista.

## Testes locais / CORS

- O worker contém uma lista `allowedOrigins` com origens permitidas (ex.: `http://localhost:3000`). Ajuste conforme necessário se testar a UI a partir de outra origem.
- Em testes locais, `OPTIONS preflight` é tratado e responde com `Access-Control-Allow-*` quando a origem está na lista.

## Deploy (resumo)

1. Configure wrangler (ou painel Cloudflare):
   - Defina variáveis de ambiente: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REFRESH_TOKEN`, `TARGET_FOLDER_ID`.
   - Adicione binding KV/Cache com o nome `FILE_CACHE`.
2. Publish: `wrangler publish` (ou deploy via painel).
3. Aceda ao domínio do Worker para usar a UI integrada.

## Segurança e limites

- O Worker usa OAuth2 refresh token para obter access tokens; proteja `GOOGLE_CLIENT_SECRET` e `REFRESH_TOKEN`.
- Verifique quotas da API do Google Drive para uploads grandes e número de requests.
- A implementação repassa headers e body entre cliente → Worker → Drive; validação de inputs mínimos é feita (ex.: `fileName`/`mimeType`).
- Ajuste `chunkSize` no cliente se necessário (o HTML/JS usa 8 MiB por chunk).

## Resolução de problemas

- "REFRESH_TOKEN não está configurado" — executar fluxo OAuth em `/oauth/login` e guardar o token em `env.REFRESH_TOKEN`.
- Erros 4xx/5xx do Drive — verifique `client_id`/`secret`, `refresh_token`, permissões da drive (scope: `https://www.googleapis.com/auth/drive`) e quotas.
- Listagem vazia — confirme `TARGET_FOLDER_ID` e permissões do token; limpe cache com `POST /invalidate-cache`.
- CORS — se testar fora das origens listadas, adicione a origem em `allowedOrigins` no `worker.js`.

## Notas adicionais (implementação)

- A UI está embutida na constante `htmlContent` em `workers/worker.js`; pode ser extraída se preferir servir ficheiro estático.
- O cache usa `env.FILE_CACHE` (binding) com TTL de 300s na listagem de ficheiros.
- O upload resumível usa a API de upload do Drive e a UI implementa a classe `ResumableUploader` (chunks, progress, ETA, retries não implementados por omissão).

## Licença e contribuições

README minimal: inclua a licença do seu projecto conforme necessário e contribuições via pull requests.