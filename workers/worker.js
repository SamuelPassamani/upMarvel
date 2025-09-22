// Lista de origens permitidas para segurança
const allowedOrigins = [
  'https://samuelpassamani.github.io',
  'http://localhost:3000', // Para testes locais
];

// Helper para criar uma resposta JSON
const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' },
  status,
});

// Manipulador principal que gere todos os pedidos
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Responde a pedidos OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      if (isAllowedOrigin) {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Url, Content-Range',
          },
        });
      }
      return new Response('Origem não permitida', { status: 403 });
    }
    
    // Bloqueia pedidos de origens não permitidas (exceto para o fluxo OAuth)
    const url = new URL(request.url);
    if (!isAllowedOrigin && !url.pathname.startsWith('/oauth')) {
        return new Response('Origem não permitida', { status: 403 });
    }

    let response;

    // Roteamento de pedidos
    if (url.pathname === '/start' && request.method === 'POST') {
      response = await handleStartUpload(request, env);
    } else if (url.pathname === '/upload' && request.method === 'PUT') {
      response = await handleUploadChunk(request, env);
    } else if (url.pathname === '/oauth/login' && request.method === 'GET') {
      response = handleOAuthLogin(request, env);
    } else if (url.pathname === '/oauth/callback' && request.method === 'GET') {
      response = await handleOAuthCallback(request, env);
    } else {
      response = new Response('404, Rota não encontrada.', { status: 404 });
    }
    
    // Adiciona o cabeçalho CORS a todas as respostas de origens permitidas
    if (isAllowedOrigin) {
      const respHeaders = new Headers(response.headers);
      respHeaders.set('Access-Control-Allow-Origin', origin);
      response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: respHeaders
      });
    }
    return response;
  }
};

// --- Rota /start ---
async function handleStartUpload(request, env) {
  try {
    const { fileName, mimeType } = await request.json();
    if (!fileName || !mimeType) {
      return jsonResponse({ success: false, error: 'fileName e mimeType são obrigatórios.' }, 400);
    }

    const accessToken = await getAccessToken(env);
    
    const apiResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: fileName, mimeType: mimeType, parents: [env.TARGET_FOLDER_ID] }),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        return jsonResponse({ success: false, error: `Falha ao iniciar upload: ${apiResponse.statusText} - ${errorBody}` }, apiResponse.status);
    }
    
    const location = apiResponse.headers.get('Location');
    return jsonResponse({ success: true, uploadUrl: location });

  } catch (error) {
    console.error("Erro em /start:", error.stack);
    return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500);
  }
}

// --- Rota /upload ---
async function handleUploadChunk(request, env) {
  try {
    const uploadUrl = request.headers.get('X-Upload-Url');
    if (!uploadUrl) {
      return jsonResponse({ success: false, error: 'O cabeçalho X-Upload-Url é obrigatório.' }, 400);
    }

    // Reencaminha o pedido para a Google, mantendo os cabeçalhos e o corpo originais
    const apiResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 
        'Content-Range': request.headers.get('Content-Range'),
        'Content-Length': request.headers.get('Content-Length'),
      },
      body: request.body,
    });
    
    // Retorna a resposta da Google diretamente para o cliente
    return new Response(apiResponse.body, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: apiResponse.headers
    });

  } catch (error) {
    console.error("Erro em /upload:", error.stack);
    return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500);
  }
}

// --- Rotas de Autenticação OAuth 2.0 ---

// Redireciona o utilizador para a página de consentimento da Google
function handleOAuthLogin(request, env) {
  const url = new URL(request.url);
  const redirectUri = `${url.protocol}//${url.hostname}/oauth/callback`;
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return Response.redirect(authUrl.toString(), 302);
}

// Lida com o redirecionamento da Google, troca o código por um refresh token
async function handleOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.protocol}//${url.hostname}/oauth/callback`;

  if (!code) {
    return new Response("Erro: Nenhum código de autorização recebido.", { status: 400, headers: {'Content-Type': 'text/html'} });
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await response.json();

    if (!response.ok || tokenData.error) {
      throw new Error(tokenData.error_description || 'Falha ao obter o refresh token.');
    }

    // Exibe o refresh token para o utilizador copiar e guardar
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Autorização Concluída</title>
          <style>
              body { font-family: sans-serif; background-color: #f0f2f5; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .container { background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center; max-width: 800px; }
              h1 { color: #2c5282; }
              p { font-size: 1.1em; }
              textarea { width: 100%; padding: 10px; margin-top: 20px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 1em; resize: none; }
              .copy-btn { background-color: #4299e1; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; font-weight: bold; }
              .copy-btn:hover { background-color: #2b6cb0; }
              .copied-msg { color: green; font-weight: bold; visibility: hidden; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>✅ Autorização Concluída com Sucesso!</h1>
              <p>Copie o <strong>Refresh Token</strong> abaixo e guarde-o na variável de ambiente <code>REFRESH_TOKEN</code> no seu Worker.</p>
              <textarea id="refreshToken" rows="5" readonly>${tokenData.refresh_token}</textarea>
              <button id="copyBtn" class="copy-btn">Copiar Token</button>
              <p id="copiedMsg" class="copied-msg">Copiado!</p>
          </div>
          <script>
              document.getElementById('copyBtn').addEventListener('click', () => {
                  const tokenText = document.getElementById('refreshToken');
                  tokenText.select();
                  document.execCommand('copy');
                  document.getElementById('copiedMsg').style.visibility = 'visible';
                  setTimeout(() => {
                      document.getElementById('copiedMsg').style.visibility = 'hidden';
                  }, 2000);
              });
          </script>
      </body>
      </html>
    `;
    return new Response(htmlResponse, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    return new Response(`<h1>Erro Crítico</h1><p>Ocorreu um erro durante o callback: ${error.message}</p>`, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}

// --- Lógica do Access Token ---

// Obtém um novo access token usando o refresh token guardado
async function getAccessToken(env) {
  if (!env.REFRESH_TOKEN || env.REFRESH_TOKEN === 'pendente') {
    throw new Error("O REFRESH_TOKEN não está configurado corretamente nas variáveis de ambiente do Worker. Conclua o processo de autorização.");
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  
  const tokenData = await response.json();

  if (!response.ok || tokenData.error) {
    console.error("Erro ao refrescar o token:", tokenData);
    throw new Error(`Não foi possível obter um novo access token: ${tokenData.error_description || 'Erro desconhecido'}`);
  }

  return tokenData.access_token;
}
