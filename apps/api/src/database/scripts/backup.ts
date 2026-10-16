import { execSync, spawn } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from apps/api/.env
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'eruditia';
const DEFAULT_CONTAINER = process.env.DB_DOCKER_CONTAINER || 'ops_postgres';

// Root directory for backups: <root>/backups
const projectRoot = path.resolve(__dirname, '../../../../..');
const defaultBackupDir = path.join(projectRoot, 'backups');

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function checkCommandAvailable(command: string): boolean {
  try {
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkDockerContainerRunning(containerName: string): boolean {
  try {
    const output = execSync('docker ps --format "{{.Names}}"', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const names = output.split(/\r?\n/).map((n) => n.trim());
    return names.includes(containerName);
  } catch {
    return false;
  }
}

function findAnyPostgresContainer(): string | null {
  try {
    const output = execSync('docker ps --filter "ancestor=postgres" --format "{{.Names}}"', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const names = output
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);
    return names.length > 0 ? names[0] : null;
  } catch {
    return null;
  }
}

async function runBackup(): Promise<void> {
  const args = process.argv.slice(2);
  const isCustomFormat = args.includes('--custom');
  const isSchemaOnly = args.includes('--schema-only');
  const isDataOnly = args.includes('--data-only');
  const includeClean = args.includes('--clean');

  const customDirArg = args.find((arg) => arg.startsWith('--output='));
  const backupDir = customDirArg ? path.resolve(customDirArg.split('=')[1]) : defaultBackupDir;

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
    now.getHours(),
  )}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  const extension = isCustomFormat ? 'dump' : 'sql';
  const fileName = `${DB_NAME}_backup_${timestamp}.${extension}`;
  const filePath = path.join(backupDir, fileName);

  console.log('\n=============================================');
  console.log('       ERUDITIA - DATABASE BACKUP            ');
  console.log('=============================================');
  console.log(`- Base de datos:  ${DB_NAME}`);
  console.log(`- Usuario:        ${DB_USERNAME}`);
  console.log(`- Host:           ${DB_HOST}:${DB_PORT}`);
  console.log(`- Formato:        ${isCustomFormat ? 'Custom binary (.dump)' : 'Plain SQL (.sql)'}`);
  console.log(`- Destino:        ${filePath}`);
  console.log('---------------------------------------------');

  const hasLocalPgDump = checkCommandAvailable('pg_dump');
  let useDocker = false;
  let dockerContainer = DEFAULT_CONTAINER;

  if (hasLocalPgDump) {
    console.log('[INFO] Usando herramienta nativa pg_dump detectada en el sistema.');
  } else {
    console.log('[INFO] pg_dump nativo no encontrado en PATH. Comprobando Docker...');
    if (checkDockerContainerRunning(DEFAULT_CONTAINER)) {
      useDocker = true;
      console.log(`[INFO] Contenedor Docker detectado: '${DEFAULT_CONTAINER}'.`);
    } else {
      const detected = findAnyPostgresContainer();
      if (detected) {
        useDocker = true;
        dockerContainer = detected;
        console.log(`[INFO] Contenedor Docker Postgres detectado: '${dockerContainer}'.`);
      } else {
        throw new Error(
          'No se encontró ni pg_dump en el PATH ni un contenedor Docker de Postgres activo.\n' +
            'Por favor, asegúrate de que el contenedor de Docker esté iniciado o instala PostgreSQL localmente.',
        );
      }
    }
  }

  console.log('[INFO] Iniciando volcado de datos...');
  const startTime = Date.now();

  const pgDumpArgs: string[] = [];

  if (isCustomFormat) {
    pgDumpArgs.push('-F', 'c');
  } else {
    pgDumpArgs.push('-F', 'p');
  }

  if (includeClean) {
    pgDumpArgs.push('--clean', '--if-exists');
  }

  if (isSchemaOnly) {
    pgDumpArgs.push('--schema-only');
  } else if (isDataOnly) {
    pgDumpArgs.push('--data-only');
  }

  if (useDocker) {
    // Docker execution
    pgDumpArgs.push('-U', DB_USERNAME, '-d', DB_NAME);

    const dockerArgs = ['exec', '-i', '-e', `PGPASSWORD=${DB_PASSWORD}`, dockerContainer, 'pg_dump', ...pgDumpArgs];

    await new Promise<void>((resolve, reject) => {
      const outputStream = fs.createWriteStream(filePath);
      const child = spawn('docker', dockerArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

      child.stdout.pipe(outputStream);

      let stderrData = '';
      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        outputStream.close();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });

      child.on('close', (code) => {
        outputStream.close(() => {
          if (code === 0) {
            resolve();
          } else {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            reject(new Error(`pg_dump en Docker falló (código ${code}): ${stderrData}`));
          }
        });
      });
    });
  } else {
    // Local execution
    pgDumpArgs.push(
      '-h',
      DB_HOST,
      '-p',
      DB_PORT,
      '-U',
      DB_USERNAME,
      '-d',
      DB_NAME,
      '-f',
      filePath,
    );

    await new Promise<void>((resolve, reject) => {
      const child = spawn('pg_dump', pgDumpArgs, {
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderrData = '';
      child.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('error', (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(new Error(`pg_dump falló (código ${code}): ${stderrData}`));
        }
      });
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const stats = fs.statSync(filePath);

  console.log('\n=============================================');
  console.log('       BACKUP COMPLETADO CON EXITO           ');
  console.log('=============================================');
  console.log(`- Archivo:       ${path.basename(filePath)}`);
  console.log(`- Ubicación:     ${filePath}`);
  console.log(`- Tamaño:        ${formatBytes(stats.size)}`);
  console.log(`- Duración:      ${duration} segundos`);
  console.log('---------------------------------------------');
  console.log('Para restaurar este backup ejecuta:');
  console.log(`  bun run db:restore "${filePath}"`);
  console.log('=============================================\n');
}

runBackup().catch((error) => {
  console.error('\n[ERROR] Falló la creación del backup:');
  console.error(error.message || error);
  process.exit(1);
});
