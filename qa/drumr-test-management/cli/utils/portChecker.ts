import { execSync } from 'node:child_process';
import * as net from 'node:net';
import * as path from 'node:path';

export function isDockerRunning(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function isPortUsedByProjectDocker(port: number): {
  containerId?: string;
  containerName?: string;
  isDocker: boolean;
} {
  try {
    const projectName = path.basename(process.cwd()).toLowerCase();

    try {
      const composeContainers = execSync(
        `docker ps --filter "label=com.docker.compose.project=${projectName}" --format "{{.Names}}\t{{.Ports}}\t{{.ID}}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      ).trim();

      if (composeContainers) {
        const lines = composeContainers.split('\n').filter(line => {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const ports = parts[1];
            return ports.includes(`:${port}->`) || ports.includes(`0.0.0.0:${port}->`) || ports.includes(`*:${port}->`);
          }
          return false;
        });

        if (lines.length > 0) {
          const [containerName, , containerId] = lines[0].split('\t');
          return {
            containerId,
            containerName,
            isDocker: true,
          };
        }
      }
    } catch {
      // Continue with fallback approach
    }

    const dockerPs = execSync(`docker ps --format "{{.Names}}\t{{.Ports}}\t{{.ID}}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const lines = dockerPs
      .trim()
      .split('\n')
      .filter(line => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const ports = parts[1];
          return ports.includes(`:${port}->`) || ports.includes(`0.0.0.0:${port}->`) || ports.includes(`*:${port}->`);
        }
        return false;
      });

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 2) {
        continue;
      }

      const [containerName, , containerId] = parts;

      const isProjectContainer =
        containerName.toLowerCase().includes(projectName.toLowerCase()) &&
        (containerName.startsWith(`${projectName}_`) ||
          containerName.startsWith(`${projectName}-`) ||
          containerName.startsWith(`${projectName}`) ||
          (containerName.includes('-db') && containerName.includes(projectName)) ||
          (containerName.includes('_db') && containerName.includes(projectName)));

      if (isProjectContainer) {
        return {
          containerId,
          containerName,
          isDocker: true,
        };
      }
    }

    return { isDocker: false };
  } catch {
    return { isDocker: false };
  }
}

export async function isPortInUse(port: number, host = 'localhost'): Promise<boolean> {
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      const netstatResult = execSync(`netstat -an | findstr :${port}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return netstatResult.trim().length > 0;
    } else {
      const lsofResult = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: 'pipe' });
      return lsofResult.trim().length > 0;
    }
  } catch {
    try {
      if (!isWindows) {
        const netstatResult = execSync(`netstat -tulpn 2>/dev/null | grep :${port}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        return netstatResult.trim().length > 0;
      }
    } catch {
      // Continue to final fallback
    }

    return new Promise(resolve => {
      const server = net.createServer();

      server.listen(port, host, () => {
        server.once('close', () => {
          resolve(false);
        });
        server.close();
      });

      server.on('error', () => {
        resolve(true);
      });
    });
  }
}

export function getProcessUsingPort(port: number): null | string {
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      const result = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      if (result.trim()) {
        const lines = result.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            try {
              const processInfo = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
                encoding: 'utf-8',
                stdio: 'pipe',
              });
              if (processInfo.trim()) {
                const processName = processInfo.split(',')[0].replace(/"/g, '');
                return `${processName} (PID: ${pid})`;
              }
            } catch {
              return `Process ID: ${pid}`;
            }
          }
        }
      }
    } else {
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: 'pipe' });
      const pid = result.trim();

      if (pid) {
        try {
          const processInfo = execSync(`ps -p ${pid} -o pid,comm,args --no-headers`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          });
          return processInfo.trim();
        } catch {
          return `Process ID: ${pid}`;
        }
      }
    }
  } catch {
    try {
      if (!isWindows) {
        const result = execSync(`netstat -tulpn 2>/dev/null | grep :${port}`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        return result.trim();
      }
    } catch {
      // If all approaches fail, we can't determine what's using the port
    }
  }

  return null;
}

export async function findAvailablePort(startingPort: number, maxAttempts = 10): Promise<null | number> {
  for (let port = startingPort; port < startingPort + maxAttempts; port++) {
    if (!(await isPortInUse(port))) {
      return port;
    }
  }

  return null;
}

export async function checkPortsUsage(ports: number[]): Promise<
  Array<{
    containerId?: string;
    containerName?: string;
    inUse: boolean;
    isProjectDocker?: boolean;
    port: number;
    process?: string;
  }>
> {
  const results = [];

  for (const port of ports) {
    const inUse = await isPortInUse(port);
    const dockerInfo = isPortUsedByProjectDocker(port);

    const result: {
      containerId?: string;
      containerName?: string;
      inUse: boolean;
      isProjectDocker?: boolean;
      port: number;
      process?: string;
    } = {
      inUse,
      isProjectDocker: dockerInfo.isDocker,
      port,
    };

    if (dockerInfo.containerId) {
      result.containerId = dockerInfo.containerId;
    }
    if (dockerInfo.containerName) {
      result.containerName = dockerInfo.containerName;
    }

    if (inUse && !dockerInfo.isDocker) {
      const process = getProcessUsingPort(port);
      if (process) {
        result.process = process;
      }
    }

    results.push(result);
  }

  return results;
}
