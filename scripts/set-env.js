const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..', 'src', 'environments');
const isProd = process.env.NODE_ENV === 'production';

// En CI/CD (Netlify, etc.) las variables vienen del entorno del proceso.
// En local se leen del archivo .env.
let apiUrl = process.env.API_URL;
let wsUrl  = process.env.WS_URL;

if (!apiUrl || !wsUrl) {
  const envFile = path.resolve(__dirname, '..', '.env');

  if (!fs.existsSync(envFile)) {
    console.error('❌ No se encontró el archivo .env y las variables API_URL / WS_URL no están definidas en el entorno.');
    console.error('   Copia .env.example como .env y configura tus valores, o define las variables de entorno.');
    process.exit(1);
  }

  // Parsea el .env manualmente (sin dependencias externas)
  const raw = fs.readFileSync(envFile, 'utf8');
  const vars = {};
  raw.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    vars[key.trim()] = rest.join('=').trim();
  });

  apiUrl = apiUrl || vars['API_URL'] || 'http://localhost:8080/api';
  wsUrl  = wsUrl  || vars['WS_URL']  || 'http://localhost:8080/ws';
}

const content = `// Generado automáticamente por scripts/set-env.js — NO editar manualmente
export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl}',
  wsUrl: '${wsUrl}'
};
`;

const fileName = isProd ? 'environment.production.ts' : 'environment.development.ts';
const targetPath = path.join(targetDir, fileName);

fs.writeFileSync(targetPath, content);
console.log(`✅ ${fileName} generado (apiUrl: ${apiUrl})`);
