import { existsSync } from 'node:fs';
import type { InitialReturnValue } from 'prompts';
import spawn from 'cross-spawn';

export const onState = (state: {
  value: InitialReturnValue;
  aborted: boolean;
  exited: boolean;
}) => {
  if (state.aborted) {
    process.nextTick(() => process.exit(1));
  }
};

export const getPkgMgr = (): [string, string] => {
  if (existsSync('package-lock.json')) {
    return ['npm', 'install'];
  }

  if (existsSync('yarn.lock')) {
    return ['yarn', 'add'];
  }

  if (existsSync('pnpm-lock.yaml')) {
    return ['pnpm', 'add'];
  }

  if (existsSync('bun.lockb')) {
    return ['bun', 'install'];
  }

  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.startsWith('npm')) {
    return ['npm', 'install'];
  }

  if (userAgent.startsWith('yarn')) {
    return ['yarn', 'add'];
  }

  if (userAgent.startsWith('pnpm')) {
    return ['pnpm', 'add'];
  }

  if (userAgent.startsWith('bun')) {
    return ['bun', 'install'];
  }

  throw new Error('Unknown Package Manager');
};

export enum Framework {
  NextJS = 'nextjs',
}

export enum MonoCloudCommand {
  Init = 'init',
}

export const execCommand = (
  command: string,
  args?: string[]
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ADBLOCK: '1',
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });
    child.on('close', code => {
      if (code !== 0) {
        const allArgs = args?.join(' ');
        reject({ command: `${command}${allArgs ? ` ${allArgs}` : ''}` });
        return;
      }
      resolve();
    });
  });
};
