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

const projectRoot = path.resolve(__dirname, '../../../../..');
const defaultBackupDir = path.join(projectRoot, 'backups');

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

function getLatestBackupFile(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.dump'))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(dir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? path.join(dir, files[0].name) : null;
}

async function runRestore(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const targetFileArg = rawArgs.find((arg) => !arg.startsWith('--'));
  const cleanFlag = rawArgs.includes('--clean');

  let targetFilePath: string;

  if (targetFileArg) {
    targetFilePath = path.resolve(targetFileArg);
  } else {
    const latest = getLatestBackupFile(defaultBackupDir);
    if (!latest) {
      throw new Error(
        `No se especificó un archivo y no se encontraron backups en: ${defaultBackupDir}\n` +
          'Uso: bun run db:restore [ruta/al/archivo.sql]',
      );
    }
    targetFilePath = latest;
  }

  if (!fs.existsSync(targetFilePath)) {
    throw new Error(`El archivo de backup no existe: ${targetFilePath}`);
  }

  const isCustomFormat = targetFilePath.endsWith('.dump');

  console.log('\n=============================================');
  console.log('       ERUDITIA - DATABASE RESTORE           ');
  console.log('=============================================');
  console.log(`- Base de datos destino: ${DB_NAME}`);
  console.log(`- Archivo origen:        ${targetFilePath}`);
  console.log(`- Formato detectado:     ${isCustomFormat ? 'Custom (pg_restore)' : 'Plain SQL (psql)'}`);
  console.log('---------------------------------------------');
  console.log('ADVERTENCIA: Esta operación restaurará datos en la base de datos.');
  console.log('---------------------------------------------');

  const requiredTool = isCustomFormat ? 'pg_restore' : 'psql';
  const hasLocalTool = checkCommandAvailable(requiredTool);
  let useDocker = false;
  let dockerContainer = DEFAULT_CONTAINER;

  if (hasLocalTool) {
    console.log(`[INFO] Usando herramienta nativa '${requiredTool}' detectada en PATH.`);
  } else {
    console.log(`[INFO] '${requiredTool}' no encontrado en PATH. Comprobando Docker...`);
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
          `No se encontró ni '${requiredTool}' en el PATH ni un contenedor Docker activo de Postgres.`,
        );
      }
    }
  }

  const startTime = Date.now();
  console.log('[INFO] Restaurando base de datos...');

  if (isCustomFormat) {
    // pg_restore
    const pgRestoreArgs = ['-U', DB_USERNAME, '-d', DB_NAME];
    if (cleanFlag) pgRestoreArgs.push('--clean', '--if-exists');

    if (useDocker) {
      const dockerArgs = [
        'exec',
        '-i',
        '-e',
        `PGPASSWORD=${DB_PASSWORD}`,
        dockerContainer,
        'pg_restore',
        ...pgRestoreArgs,
      ];

      await new Promise<void>((resolve, reject) => {
        const inputStream = fs.createReadStream(targetFilePath);
        const child = spawn('docker', dockerArgs, { stdio: ['pipe', 'inherit', 'pipe'] });

        inputStream.pipe(child.stdin);

        let stderrData = '';
        child.stderr?.on('data', (d) => {
          stderrData += d.toString();
        });

        child.on('close', (code) => {
          // pg_restore returns 0 on success, or 1 if there were minor warnings
          if (code === 0 || code === 1) {
            resolve();
          } else {
            reject(new Error(`pg_restore falló (código ${code}): ${stderrData}`));
          }
        });
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('pg_restore', ['-h', DB_HOST, '-p', DB_PORT, ...pgRestoreArgs, targetFilePath], {
          env: { ...process.env, PGPASSWORD: DB_PASSWORD },
          stdio: ['inherit', 'inherit', 'pipe'],
        });

        let stderrData = '';
        child.stderr?.on('data', (d) => {
          stderrData += d.toString();
        });

        child.on('close', (code) => {
          if (code === 0 || code === 1) {
            resolve();
          } else {
            reject(new Error(`pg_restore falló (código ${code}): ${stderrData}`));
          }
        });
      });
    }
  } else {
    // psql
    if (useDocker) {
      const dockerArgs = [
        'exec',
        '-i',
        '-e',
        `PGPASSWORD=${DB_PASSWORD}`,
        dockerContainer,
        'psql',
        '-U',
        DB_USERNAME,
        '-d',
        DB_NAME,
      ];

      await new Promise<void>((resolve, reject) => {
        const inputStream = fs.createReadStream(targetFilePath);
        const child = spawn('docker', dockerArgs, { stdio: ['pipe', 'inherit', 'pipe'] });

        inputStream.pipe(child.stdin);

        let stderrData = '';
        child.stderr?.on('data', (d) => {
          stderrData += d.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`psql falló (código ${code}): ${stderrData}`));
          }
        });
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const inputStream = fs.createReadStream(targetFilePath);
        const child = spawn(
          'psql',
          ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USERNAME, '-d', DB_NAME],
          {
            env: { ...process.env, PGPASSWORD: DB_PASSWORD },
            stdio: ['pipe', 'inherit', 'pipe'],
          },
        );

        inputStream.pipe(child.stdin);

        let stderrData = '';
        child.stderr?.on('data', (d) => {
          stderrData += d.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`psql falló (código ${code}): ${stderrData}`));
          }
        });
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n=============================================');
  console.log('       RESTAURACION COMPLETADA CON EXITO     ');
  console.log('=============================================');
  console.log(`- Base de datos:  ${DB_NAME}`);
  console.log(`- Duración:       ${duration} segundos`);
  console.log('=============================================\n');
}

runRestore().catch((error) => {
  console.error('\n[ERROR] Falló la restauración:');
  console.error(error.message || error);
  process.exit(1);
});
