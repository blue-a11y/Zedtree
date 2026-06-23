import { execa } from 'execa';
import { spawnSync } from 'node:child_process';
import type { OpenMode } from './config.js';

const ZED_NOT_FOUND_HINT = '未找到 zed CLI，请在 zed 菜单 → Install CLI 安装后重试';

export const isZedAvailable = (): boolean => {
  const r = spawnSync('which', ['zed'], { stdio: 'ignore' });
  return r.status === 0;
};

export const openInZed = async (path: string, mode: OpenMode): Promise<void> => {
  if (!isZedAvailable()) {
    throw new Error(ZED_NOT_FOUND_HINT);
  }
  const args = mode === 'new-window' ? ['--new-window', path] : [path];
  const sub = execa('zed', args, { detached: true, stdio: 'ignore' });
  sub.unref();
};
