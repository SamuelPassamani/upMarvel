// O conteúdo completo do seu index.html é guardado aqui.
// O Worker irá servir esta página quando alguém aceder ao URL principal.
const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Heroico</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Bangers&display=swap" rel="stylesheet">
    <style>
        :root { --marvel-red: #ED1D24; --marvel-blue: #0078D4; --marvel-yellow: #FFD700; }
        .pixel-corners { clip-path: polygon( 0px 4px, 4px 4px, 4px 0px, calc(100% - 4px) 0px, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0px calc(100% - 4px) ); }
        .pixel-font { font-family: 'Press Start 2P', monospace; image-rendering: pixelated; }
        .comic-font { font-family: 'Bangers', cursive; letter-spacing: 0.05em; }
        @keyframes pixelGlow { 0%, 100% { text-shadow: 0 0 5px var(--marvel-yellow), 0 0 10px var(--marvel-yellow); } 50% { text-shadow: 0 0 10px var(--marvel-yellow), 0 0 20px var(--marvel-yellow); } }
        .pixel-glow { animation: pixelGlow 2s infinite; }
        .hero-entrance { animation: heroEntry 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        @keyframes heroEntry { 0% { transform: translateY(-50px) scale(0.8); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .marvel-btn { position: relative; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.2s; border: 3px solid black; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); }
        .marvel-btn:hover { box-shadow: 6px 6px 0px 0px rgba(0,0,0,1); transform: translate(-2px, -2px); }
        .comic-card { border: 4px solid black; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .comic-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px); background-size: 10px 10px; pointer-events: none; z-index: 1; }
        .upload-zone { border: 2px solid #e5e7eb; transition: all 0.3s ease; position: relative; background-color: #f9fafb; }
        .upload-zone.drag-over { border-color: var(--marvel-blue); }
        .progress-fill { height: 100%; transition: width 0.3s ease; position: relative; background: linear-gradient(90deg, var(--marvel-red) 0%, var(--marvel-yellow) 50%, var(--marvel-blue) 100%); }
        .progress-fill.success { background: linear-gradient(90deg, #28a745 0%, #20c997 100%); }
        .progress-fill.error { background: linear-gradient(90deg, #dc3545 0%, #fd7e14 100%); }
        .file-item, .explorer-item { transition: all 0.3s ease; border: 3px solid black; position: relative; }
        .message { border: 3px solid black; padding: 0.75rem; position: relative; }
        .message.success { background: #d4edda; border-color: #28a745; }
        .message.error { background: #f8d7da; border-color: #dc3545; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border: 1px solid black; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(135deg, var(--marvel-red), var(--marvel-yellow)); border: 1px solid black; }
        .modal-content { animation: modalEntry 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        @keyframes modalEntry { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
    <div class="fixed inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 20px 20px;"></div>
    <div class="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div class="flex flex-col h-full">
            <div class="text-center mb-8 hero-entrance">
                <h1 class="text-5xl md:text-6xl font-bold text-yellow-400 pixel-font mb-4 pixel-glow inline-flex items-center gap-4"><i data-lucide="upload-cloud" class="w-12 h-12"></i>UPLOAD HEROICO</h1>
                <p class="text-lg md:text-xl text-white comic-font">Envie seus arquivos com poderes épicos!</p>
            </div>
            <div class="comic-card bg-white pixel-corners shadow-2xl flex-grow">
                <div class="bg-black text-white p-4 border-b-4 border-yellow-400"><h2 class="text-xl font-semibold pixel-font text-center flex items-center justify-center"><i data-lucide="shield-check" class="w-8 h-8 mr-3"></i>CENTRO DE UPLOAD</h2></div>
                <div class="p-4 flex flex-col flex-grow">
                    <div class="border-2 border-dashed border-gray-400 p-2 pixel-corners flex-grow">
                        <div id="uploadZone" class="upload-zone pixel-corners h-full flex flex-col items-center justify-center p-8 cursor-pointer relative">
                            <div class="upload-content text-center">
                                <i data-lucide="cloud-fog" class="w-16 h-16 md:w-20 md:h-20 mx-auto text-gray-400 mb-4"></i>
                                <h3 class="text-xl md:text-2xl font-bold text-gray-700 comic-font mb-2">🚀 ARRASTE E SOLTE SEUS ARQUIVOS</h3>
                                <p class="text-gray-600 comic-font mb-6">ou clique para selecionar arquivos do seu dispositivo</p>
                                <button id="browseBtn" class="marvel-btn bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 pixel-corners comic-hover"><i data-lucide="folder-open" class="w-5 h-5 inline mr-2"></i><span class="pixel-font text-sm">PROCURAR ARQUIVOS</span></button>
                                <div class="mt-6 text-xs text-gray-500 comic-font space-y-1">
                                    <p>📁 Todos os tipos de arquivo aceitos</p>
                                    <p>⚡ Upload em blocos para máxima eficiência</p>
                                    <p>🛡️ Transferência segura e confiável</p>
                                </div>
                            </div>
                            <input type="file" id="fileInput" multiple class="hidden">
                        </div>
                    </div>
                    <div id="filesContainer" class="mt-4 hidden"><div id="filesList" class="file-list space-y-3 max-h-60 overflow-y-auto p-2 bg-gray-100 border-2 border-black custom-scrollbar"></div></div>
                    <div id="messagesArea" class="mt-4"><div class="message success pixel-corners comic-font"><div class="flex items-center"><span class="text-xl mr-3">🚀</span><span class="text-sm">Sistema de Upload pronto para ação!</span></div></div></div>
                </div>
            </div>
        </div>
        <div class="flex flex-col h-full">
            <div class="text-center mb-8 hero-entrance" style="animation-delay: 0.2s;">
                 <h1 class="text-5xl md:text-6xl font-bold text-yellow-400 pixel-font mb-4 pixel-glow inline-flex items-center gap-4"><i data-lucide="library" class="w-12 h-12"></i>SALÃO DE REGISTOS</h1>
                <p class="text-lg md:text-xl text-white comic-font">O histórico das suas missões!</p>
            </div>
            <div class="comic-card bg-white pixel-corners shadow-2xl flex-grow">
                 <div class="bg-black text-white p-4 border-b-4 border-yellow-400 flex justify-between items-center">
                    <h2 class="text-xl font-semibold pixel-font flex items-center"><i data-lucide="archive" class="w-8 h-8 mr-3"></i>ARQUIVOS NO DRIVE</h2>
                    <button id="refreshExplorerBtn" class="marvel-btn bg-blue-600 hover:bg-blue-700 text-white p-2 pixel-corners"><i data-lucide="refresh-cw" class="w-5 h-5"></i></button>
                </div>
                <div id="explorerList" class="p-4 space-y-3 flex-grow overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>
    </div>
    <div id="previewModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 hidden">
        <div class="modal-content comic-card bg-white pixel-corners shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div class="bg-black text-white p-4 border-b-4 border-yellow-400 flex justify-between items-center">
                <h3 id="modalTitle" class="text-lg font-semibold pixel-font truncate">Pré-visualização</h3>
                <button id="modalCloseBtn" class="marvel-btn bg-red-600 hover:bg-red-700 text-white p-2 pixel-corners"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div id="modalBody" class="p-4 flex-grow overflow-auto flex items-center justify-center bg-gray-100"></div>
        </div>
    </div>
    <script>
        // O WORKER_URL agora é relativo à página atual, pois tudo está no mesmo domínio.
        const WORKER_URL = "";
        
        lucide.createIcons();
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');
        const filesContainer = document.getElementById('filesContainer');
        const filesList = document.getElementById('filesList');
        const messagesArea = document.getElementById('messagesArea');
        const explorerList = document.getElementById('explorerList');
        const refreshExplorerBtn = document.getElementById('refreshExplorerBtn');
        const previewModal = document.getElementById('previewModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalCloseBtn = document.getElementById('modalCloseBtn');

        function formatBytes(bytes, decimals = 2) {
            if (!bytes || bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
        }

        function displayMessage(message, type = 'info') {
            const messageEl = document.createElement('div');
            messageEl.className = \`message \${type} pixel-corners comic-font\`;
            const icons = { success: '✅', error: '❌', loading: '⏳', info: 'ℹ️' };
            messageEl.innerHTML = \`<div class="flex items-center"><span class="text-xl mr-3">\${icons[type]}</span><span class="text-sm">\${message}</span></div>\`;
            messagesArea.innerHTML = '';
            messagesArea.appendChild(messageEl);
        }
        
        function handleFiles(files) {
            if (files.length === 0) return;
            filesContainer.classList.remove('hidden');
            Array.from(files).forEach(file => new ResumableUploader(file).start());
            fileInput.value = '';
        }

        class ResumableUploader {
            constructor(file) { this.file = file; this.uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2); this.chunkSize = 1024 * 1024 * 8; this.offset = 0; this.startTime = Date.now(); this.createUI(); }
            createUI() { const fileItem = document.createElement('div'); fileItem.id = \`file-item-\${this.uniqueId}\`; fileItem.className = 'file-item pending pixel-corners p-4'; fileItem.innerHTML = \`<div class="flex items-center justify-between mb-3"><div class="flex items-center space-x-3 flex-1 min-w-0"><div class="status-icon pending pixel-corners">⏳</div><div class="flex-1 min-w-0"><h4 class="font-bold text-gray-800 comic-font truncate" title="\${this.file.name}">📄 \${this.file.name}</h4><p class="text-sm text-gray-600 pixel-font">\${formatBytes(this.file.size)}</p></div></div></div><div class="progress-details"><div class="progress-bar pixel-corners mb-2"><div class="progress-fill" style="width: 0%"></div></div><div class="flex justify-between items-center text-xs pixel-font"><span class="percentage text-gray-600">0%</span><div class="progress-stats flex space-x-4"><span class="speed text-blue-600"></span><span class="eta text-purple-600"></span></div></div><div class="error-text mt-2 text-xs text-red-600 comic-font bg-red-100 p-2 pixel-corners border border-red-300 hidden"></div></div>\`; filesList.prepend(fileItem); this.ui = { item: fileItem, progressBar: fileItem.querySelector('.progress-fill'), percentage: fileItem.querySelector('.percentage'), speed: fileItem.querySelector('.speed'), eta: fileItem.querySelector('.eta'), statusIcon: fileItem.querySelector('.status-icon'), errorText: fileItem.querySelector('.error-text'), }; }
            async start() { this.setStatus('uploading', '🚀'); try { const response = await fetch(\`\${WORKER_URL}/start\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: this.file.name, mimeType: this.file.type || 'application/octet-stream' }) }); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || \`Erro do Servidor: \${response.statusText}\`); this.uploadUrl = data.uploadUrl; this.uploadChunk(); } catch (error) { this.onError(error); } }
            async uploadChunk() { if (this.offset >= this.file.size) return; const end = Math.min(this.offset + this.chunkSize, this.file.size); const chunk = this.file.slice(this.offset, end); try { const response = await fetch(\`\${WORKER_URL}/upload\`, { method: 'PUT', headers: { 'Content-Range': \`bytes \${this.offset}-\${end - 1}/\${this.file.size}\`, 'X-Upload-Url': this.uploadUrl }, body: chunk }); if (response.status === 308) { this.offset = end; this.onProgress(); this.uploadChunk(); } else if (response.ok) { this.offset = this.file.size; this.onProgress(); this.onComplete(); } else { const errorBody = await response.text(); throw new Error(\`Falha no envio do bloco: \${response.statusText} - \${errorBody}\`); } } catch (error) { this.onError(error); } }
            setStatus(status, icon) { this.ui.item.className = \`file-item \${status} pixel-corners p-4\`; this.ui.statusIcon.className = \`status-icon \${status} pixel-corners\`; this.ui.statusIcon.textContent = icon; }
            onProgress() { const percent = Math.round((this.offset / this.file.size) * 100); this.ui.progressBar.style.width = \`\${percent}%\`; const elapsedTime = (Date.now() - this.startTime) / 1000; const speed = elapsedTime > 0 ? this.offset / elapsedTime : 0; const remainingBytes = this.file.size - this.offset; const eta = speed > 0 ? remainingBytes / speed : 0; this.ui.percentage.textContent = \`\${percent}%\`; this.ui.speed.textContent = \`⚡ \${formatBytes(speed)}/s\`; this.ui.eta.textContent = \`⏱️ \${eta < 1 ? '< 1s' : Math.round(eta) + 's'}\`; }
            onComplete() { this.setStatus('success', '✅'); this.ui.progressBar.classList.add('success'); this.ui.percentage.textContent = 'Concluído!'; this.ui.speed.textContent = ''; this.ui.eta.textContent = ''; invalidateCacheAndRefresh(); }
            onError(error) { console.error(\`[\${this.file.name}] Erro no upload:\`, error); this.setStatus('error', '❌'); this.ui.progressBar.classList.add('error'); this.ui.percentage.textContent = 'Erro!'; this.ui.errorText.textContent = \`Detalhe: \${error.message}\`; this.ui.errorText.classList.remove('hidden'); }
        }

        async function fetchFiles() { explorerList.innerHTML = \`<p class="text-center comic-font p-4">🔍 A procurar registos...</p>\`; try { const response = await fetch(\`\${WORKER_URL}/files\`); const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Falha ao obter a lista de ficheiros.'); renderFiles(data.files); } catch (error) { explorerList.innerHTML = \`<p class="text-center comic-font p-4 text-red-600">❌ Erro ao carregar registos: \${error.message}</p>\`; } }
        function renderFiles(files) { if (files.length === 0) { explorerList.innerHTML = \`<p class="text-center comic-font p-4">텅 Nenhum ficheiro encontrado.</p>\`; return; } explorerList.innerHTML = files.map(file => \`<div class="explorer-item bg-gray-50 hover:bg-blue-100 pixel-corners p-3 flex items-center gap-4 cursor-pointer" data-fileid="\${file.id}" data-filename="\${file.name}" data-mimetype="\${file.mimeType}"><img src="\${file.iconLink}" class="w-8 h-8 flex-shrink-0" alt="ícone do ficheiro"><div class="flex-grow min-w-0"><p class="font-bold text-gray-800 comic-font truncate" title="\${file.name}">\${file.name}</p><p class="text-xs text-gray-600 pixel-font">\${formatBytes(file.size || 0)} - \${new Date(file.createdTime).toLocaleDateString()}</p></div></div>\`).join(''); }
        async function showPreview(fileId, fileName, mimeType) { modalTitle.textContent = fileName; modalBody.innerHTML = \`<p class="text-center comic-font">A carregar pré-visualização...</p>\`; previewModal.classList.remove('hidden'); try { const response = await fetch(\`\${WORKER_URL}/download/\${fileId}\`); if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Não foi possível carregar o ficheiro.'); } const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); let contentHTML = ''; if (mimeType.startsWith('image/')) { contentHTML = \`<img src="\${objectUrl}" class="max-w-full max-h-full object-contain">\`; } else if (mimeType.startsWith('video/')) { contentHTML = \`<video src="\${objectUrl}" controls class="max-w-full max-h-full"></video>\`; } else if (mimeType.startsWith('audio/')) { contentHTML = \`<audio src="\${objectUrl}" controls></audio>\`; } else { contentHTML = \`<p class="text-center comic-font">Pré-visualização não suportada.<br><a href="\${objectUrl}" download="\${fileName}" class="marvel-btn bg-blue-600 text-white p-2 mt-4 inline-block">Descarregar</a></p>\`; } modalBody.innerHTML = contentHTML; } catch (error) { modalBody.innerHTML = \`<p class="text-center comic-font text-red-600">❌ Erro ao carregar: \${error.message}</p>\`; } }
        function closePreview() { const mediaElement = modalBody.querySelector('video, audio'); if (mediaElement) mediaElement.src = ''; modalBody.innerHTML = ''; previewModal.classList.add('hidden'); }
        async function invalidateCacheAndRefresh() { try { await fetch(\`\${WORKER_URL}/invalidate-cache\`, { method: 'POST' }); } catch (error) { console.error("Falha ao invalidar o cache.", error); } await fetchFiles(); }

        function setupEventListeners() {
            const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => document.body.addEventListener(eventName, preventDefaults));
            uploadZone.addEventListener('dragover', () => uploadZone.classList.add('drag-over'));
            uploadZone.addEventListener('dragleave', (e) => { if (!uploadZone.contains(e.relatedTarget)) uploadZone.classList.remove('drag-over'); });
            uploadZone.addEventListener('drop', (e) => { uploadZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
            browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
            uploadZone.addEventListener('click', (e) => { if (e.target !== browseBtn && !browseBtn.contains(e.target)) fileInput.click(); });
            fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
            refreshExplorerBtn.addEventListener('click', fetchFiles);
            modalCloseBtn.addEventListener('click', closePreview);
            previewModal.addEventListener('click', (e) => { if (e.target === previewModal) closePreview(); });
            explorerList.addEventListener('click', (e) => { const item = e.target.closest('.explorer-item'); if (item) { const { fileid, filename, mimetype } = item.dataset; showPreview(fileid, filename, mimetype); } });
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            if ("" === "YOUR_WORKER_URL") { displayMessage('⚠️ URL do Cloudflare Worker não configurada!', 'error'); } 
            else { displayMessage('🚀 Sistema de Upload pronto para ação!', 'success'); }
            setupEventListeners();
            fetchFiles();
        });
    <\/script>
</body>
</html>
`;

// Lista de origens permitidas (relevante apenas para testes locais)
const allowedOrigins = [
  'http://localhost:3000',
  'null', 
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
    const url = new URL(request.url);

    // Se a origem for o próprio Worker, não precisamos de cabeçalhos CORS
    const isSameOrigin = !origin || url.origin === origin;

    // Responde a pedidos OPTIONS (preflight) para testes locais
    if (request.method === 'OPTIONS') {
      if (isAllowedOrigin) {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Url, Content-Range' } });
      }
      return new Response('Origem não permitida', { status: 403 });
    }
    
    // --- ROTEAMENTO ---

    // 1. Servir a página HTML principal
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(htmlContent, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    // 2. Rotas da API
    let response;
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
    
    // Adiciona o cabeçalho CORS apenas se a origem for permitida e não for a mesma
    if (isAllowedOrigin && !isSameOrigin) {
      const respHeaders = new Headers(response.headers);
      respHeaders.set('Access-Control-Allow-Origin', origin);
      response = new Response(response.body, { status: response.status, statusText: response.statusText, headers: respHeaders });
    }
    return response;
  }
};

// --- ROTAS DA API ---

async function handleListFiles(request, env) {
    const cacheKey = `files-list-${env.TARGET_FOLDER_ID}`;
    try {
        const cachedFiles = await env.FILE_CACHE.get(cacheKey);
        if (cachedFiles) {
            return jsonResponse({ success: true, files: JSON.parse(cachedFiles), source: 'cache' });
        }
        const accessToken = await getAccessToken(env);
        const query = `'${env.TARGET_FOLDER_ID}' in parents and trashed = false`;
        const fields = 'files(id, name, size, iconLink, webViewLink, createdTime, mimeType)';
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc`;
        const apiResponse = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!apiResponse.ok) throw new Error(`Falha ao contactar a API do Google: ${apiResponse.statusText}`);
        const data = await apiResponse.json();
        await env.FILE_CACHE.put(cacheKey, JSON.stringify(data.files), { expirationTtl: 300 });
        return jsonResponse({ success: true, files: data.files, source: 'api' });
    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

async function handleInvalidateCache(request, env) {
    const cacheKey = `files-list-${env.TARGET_FOLDER_ID}`;
    await env.FILE_CACHE.delete(cacheKey);
    return jsonResponse({ success: true, message: 'Cache invalidado.' });
}

async function handleDownloadFile(request, env) {
    try {
        const fileId = new URL(request.url).pathname.split('/')[2];
        if (!fileId) return jsonResponse({ success: false, error: 'O ID do ficheiro é obrigatório.' }, 400);
        const accessToken = await getAccessToken(env);
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const apiResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            return jsonResponse({ success: false, error: `Falha ao obter o ficheiro: ${apiResponse.statusText}`, details: errorBody }, apiResponse.status);
        }
        return new Response(apiResponse.body, { status: apiResponse.status, headers: { 'Content-Type': apiResponse.headers.get('Content-Type'), 'Content-Length': apiResponse.headers.get('Content-Length'), 'Content-Disposition': apiResponse.headers.get('Content-Disposition') || `attachment; filename="download"`, } });
    } catch (error) {
        return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500);
    }
}

async function handleStartUpload(request, env) {
  try {
    const { fileName, mimeType } = await request.json();
    if (!fileName || !mimeType) return jsonResponse({ success: false, error: 'fileName e mimeType são obrigatórios.' }, 400);
    const accessToken = await getAccessToken(env);
    const apiResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fileName, mimeType: mimeType, parents: [env.TARGET_FOLDER_ID] }), });
    if (!apiResponse.ok) { const errorBody = await apiResponse.text(); return jsonResponse({ success: false, error: `Falha ao iniciar upload: ${apiResponse.statusText} - ${errorBody}` }, apiResponse.status); }
    const location = apiResponse.headers.get('Location');
    return jsonResponse({ success: true, uploadUrl: location });
  } catch (error) { return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500); }
}

async function handleUploadChunk(request, env) {
  try {
    const uploadUrl = request.headers.get('X-Upload-Url');
    if (!uploadUrl) return jsonResponse({ success: false, error: 'O cabeçalho X-Upload-Url é obrigatório.' }, 400);
    const apiResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': request.headers.get('Content-Range'), 'Content-Length': request.headers.get('Content-Length'), }, body: request.body, });
    return new Response(apiResponse.body, { status: apiResponse.status, statusText: apiResponse.statusText, headers: apiResponse.headers });
  } catch (error) { return jsonResponse({ success: false, error: `Erro interno do servidor: ${error.message}` }, 500); }
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
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code', }), });
    const tokenData = await response.json();
    if (!response.ok || tokenData.error) throw new Error(tokenData.error_description || 'Falha ao obter o refresh token.');
    return new Response(`<h1>Autorização Concluída</h1><p>Copie o Refresh Token abaixo e guarde-o na variável REFRESH_TOKEN no seu Worker:</p><textarea rows="5" readonly>${tokenData.refresh_token}</textarea>`, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) { return new Response(`<h1>Erro Crítico</h1><p>${error.message}</p>`, { status: 500, headers: { 'Content-Type': 'text/html' } }); }
}

async function getAccessToken(env) {
  if (!env.REFRESH_TOKEN || env.REFRESH_TOKEN === 'pendente') {
    throw new Error("O REFRESH_TOKEN não está configurado. Conclua o processo de autorização em /oauth/login.");
  }
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.REFRESH_TOKEN, grant_type: 'refresh_token', }), });
  const tokenData = await response.json();
  if (!response.ok || tokenData.error) { console.error("Erro ao refrescar o token:", tokenData); throw new Error(`Não foi possível obter um novo access token: ${tokenData.error_description || 'Erro desconhecido'}`); }
  return tokenData.access_token;
}
