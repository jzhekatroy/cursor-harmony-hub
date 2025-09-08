const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

// Создаем самоподписанный сертификат
const { execSync } = require('child_process');

const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('🔐 Создаем самоподписанный сертификат...');
  try {
    execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`);
    console.log('✅ Сертификат создан');
  } catch (error) {
    console.error('❌ Ошибка создания сертификата:', error.message);
    console.log('💡 Установите OpenSSL: brew install openssl');
    process.exit(1);
  }
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Создаем прокси для Next.js сервера
const proxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
});

// Создаем HTTPS сервер
const server = https.createServer(options, (req, res) => {
  // Добавляем заголовки для CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  proxy(req, res);
});

const PORT = 3443;
server.listen(PORT, () => {
  console.log(`🚀 HTTPS прокси запущен на https://localhost:${PORT}`);
  console.log(`📱 Публичная страница записи: https://localhost:${PORT}/book/first`);
  console.log(`🔗 Админ панель: https://localhost:${PORT}/admin`);
  console.log('');
  console.log('⚠️  Браузер покажет предупреждение о небезопасном сертификате');
  console.log('   Нажмите "Дополнительно" → "Перейти на localhost (небезопасно)"');
  console.log('');
  console.log('🛑 Для остановки нажмите Ctrl+C');
});
