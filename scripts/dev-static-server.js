// Servidor estático simples para servir dist/futnerds/browser localmente,
// com fallback de SPA correto: qualquer caminho que não seja um ARQUIVO real
// em disco cai em index.html (mesmo que exista uma pasta com esse nome, como
// public/nacoes/, que colide com a rota Angular /nacoes).
//
// Usado só neste ambiente porque `ng serve` (watch mode) quebra num bug
// conhecido do Angular CLI/webpack (glob-to-regexp) quando o caminho do
// projeto tem parênteses, como "C:\Users\(o-0)\...". Rodar com:
//   node scripts/dev-static-server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', 'dist', 'futnerds', 'browser');
const PORTA = process.env.PORT ? Number(process.env.PORT) : 4200;

const TIPOS_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function enviarArquivo(res, caminho) {
  const ext = path.extname(caminho).toLowerCase();
  fs.readFile(caminho, (erro, dados) => {
    if (erro) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro ao ler arquivo: ' + erro.message);
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPOS_MIME[ext] || 'application/octet-stream' });
    res.end(dados);
  });
}

const servidor = http.createServer((req, res) => {
  let caminhoUrl;
  try {
    caminhoUrl = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    caminhoUrl = req.url.split('?')[0];
  }

  const caminhoArquivo = path.normalize(path.join(RAIZ, caminhoUrl));

  // Nunca deixa escapar da pasta raiz (proteção básica contra path traversal).
  if (!caminhoArquivo.startsWith(RAIZ)) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  fs.stat(caminhoArquivo, (erro, stats) => {
    if (!erro && stats.isFile()) {
      enviarArquivo(res, caminhoArquivo);
      return;
    }
    // Não é um arquivo real (não existe, ou é uma pasta como /nacoes/) ->
    // fallback de SPA: serve o index.html e deixa o Angular Router assumir.
    enviarArquivo(res, path.join(RAIZ, 'index.html'));
  });
});

servidor.listen(PORTA, () => {
  console.log(`FutNerds (build estático) rodando em http://localhost:${PORTA}`);
});
