// Lista de origens permitidas para segurança
const allowedOrigins = [
  'https://samuelpassamani.github.io',
  'http://localhost:3000', // Para testes locais
];

// Helper para criar uma resposta JSON uniforme
const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' },
  status,
});

// Manipulador principal que gere todos os pedidos
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Responde a todos os pedidos OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      if (isAllowedOrigin) {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Url, Content-Range',
          },
        });
      }
      return new Response('Pedido OPTIONS de origem não permitida', { status: 403 });
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
    } else if (url.pathname === '/files' && request.method === 'GET') {
      response = await handleListFiles(request, env);
    } else if (url.pathname === '/invalidate-cache' && request.method === 'POST') {
      response = await handleInvalidateCache(request, env);
    } else if (url.pathname.startsWith('/download/') && request.method === 'GET') {
      response = await handleDownloadFile(request, env);
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
      response = new Response(response.body, { status: response.status, statusText: response.statusText, headers: respHeaders });
    }
    return response;
  }
};

// --- Rota /files (com Cache KV) ---
async function handleListFiles(request, env) {
    const cacheKey = `files-list-${env.TARGET_FOLDER_ID}`;
    try {
        // Tenta obter do cache primeiro
        const cachedFiles = await env.FILE_CACHE.get(cacheKey);
        if (cachedFiles) {
            return jsonResponse({ success: true, files: JSON.parse(cachedFiles), source: 'cache' });
        }

        // Se não estiver no cache, obtém da API do Google
        const accessToken = await getAccessToken(env);
        const query = `'${env.TARGET_FOLDER_ID}' in parents and trashed = false`;
        const fields = 'files(id, name, size, iconLink, webViewLink, createdTime, mimeType)';
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc`;

        const apiResponse = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!apiResponse.ok) throw new Error(`Falha ao contactar a API do Google: ${apiResponse.statusText}`);
        
        const data = await apiResponse.json();
        
        // Guarda o resultado no cache por 5 minutos
        await env.FILE_CACHE.put(cacheKey, JSON.stringify(data.files), { expirationTtl: 300 });

        return jsonResponse({ success: true, files: data.files, source: 'api' });
    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

// --- Rota /invalidate-cache ---
async function handleInvalidateCache(request, env) {
    const cacheKey = `files-list-${env.TARGET_FOLDER_ID}`;
    await env.FILE_CACHE.delete(cacheKey);
    return jsonResponse({ success: true, message: 'Cache invalidado.' });
}

// --- Rota /download/:fileId (com Chave de API Segura) ---
async function handleDownloadFile(request, env) {
    try {
        const fileId = new URL(request.url).pathname.split('/')[2];
        if (!fileId) {
            return jsonResponse({ success: false, error: 'O ID do ficheiro é obrigatório.' }, 400);
        }

        // **CORREÇÃO:** Lê a chave de API das variáveis de ambiente secretas
        const apiKey = env.GOOGLE_API_KEY;
        if (!apiKey) {
            return jsonResponse({ success: false, error: 'A Chave de API da Google não está configurada no Worker.' }, 500);
        }

        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        
        // Otimização: Não precisamos de um token de acesso para ficheiros públicos
        const apiResponse = await fetch(downloadUrl);

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            return jsonResponse({ success: false, error: `Falha ao obter o ficheiro: ${apiResponse.statusText}`, details: errorBody }, apiResponse.status);
        }

        // Reencaminha a resposta do ficheiro diretamente para o cliente
        return new Response(apiResponse.body, {
            status: apiResponse.status,
            headers: {
                'Content-Type': apiResponse.headers.get('Content-Type'),
                'Content-Length': apiResponse.headers.get('Content-Length'),
                'Content-Disposition': apiResponse.headers.get('Content-Disposition') || `attachment; filename="download"`,
            }
        });
    } catch (error) {
        return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500);
    }
}


// --- Rotas de Upload e Autenticação (sem alterações) ---

async function handleStartUpload(request, env) {
  try {
    const { fileName, mimeType } = await request.json();
    if (!fileName || !mimeType) return jsonResponse({ success: false, error: 'fileName e mimeType são obrigatórios.' }, 400);
    const accessToken = await getAccessToken(env);
    const apiResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName, mimeType: mimeType, parents: [env.TARGET_FOLDER_ID] }),
    });
    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        return jsonResponse({ success: false, error: `Falha ao iniciar upload: ${apiResponse.statusText} - ${errorBody}` }, apiResponse.status);
    }
    const location = apiResponse.headers.get('Location');
    return jsonResponse({ success: true, uploadUrl: location });
  } catch (error) {
    return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500);
  }
}

async function handleUploadChunk(request, env) {
  try {
    const uploadUrl = request.headers.get('X-Upload-Url');
    if (!uploadUrl) return jsonResponse({ success: false, error: 'O cabeçalho X-Upload-Url é obrigatório.' }, 400);
    const apiResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 
        'Content-Range': request.headers.get('Content-Range'),
        'Content-Length': request.headers.get('Content-Length'),
      },
      body: request.body,
    });
    return new Response(apiResponse.body, { status: apiResponse.status, statusText: apiResponse.statusText, headers: apiResponse.headers });
  } catch (error) {
    return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500);
  }
}

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

async function handleOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return new Response("Erro: Código de autorização não recebido.", { status: 400 });

  const redirectUri = `${url.protocol}//${url.hostname}/oauth/callback`;
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
    if (!response.ok || tokenData.error) throw new Error(tokenData.error_description || 'Falha ao obter o refresh token.');
    
    return new Response(`<h1>Autorização Concluída</h1><p>Copie o Refresh Token abaixo e guarde-o na variável REFRESH_TOKEN no seu Worker:</p><textarea rows="5" readonly>${tokenData.refresh_token}</textarea>`, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    return new Response(`<h1>Erro Crítico</h1><p>${error.message}</p>`, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}

async function getAccessToken(env) {
  if (!env.REFRESH_TOKEN || env.REFRESH_TOKEN === 'pendente') {
    throw new Error("O REFRESH_TOKEN não está configurado. Conclua o processo de autorização em /oauth/login.");
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
