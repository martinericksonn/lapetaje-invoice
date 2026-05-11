import { spawn } from 'node:child_process';

export function resolveOpenCommand(platform, filePath) {
  if (platform === 'darwin') return { cmd: 'open', args: [filePath] };
  if (platform === 'win32') return { cmd: 'cmd', args: ['/c', 'start', '', filePath] };
  return { cmd: 'xdg-open', args: [filePath] };
}

export function openFile(filePath) {
  const { cmd, args } = resolveOpenCommand(process.platform, filePath);
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}
