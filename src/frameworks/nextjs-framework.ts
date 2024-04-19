import { randomBytes } from 'node:crypto';
import prompts from 'prompts';
import { blue, gray } from 'picocolors';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { EOL } from 'node:os';
import { FrameworkType } from './framework-type';
import { validate } from '../validation';
import { onState, getPkgMgr, execCommand } from '../common';
import { MonoCloudCliOptions } from '../monocloud-cli-options';
import { join } from 'node:path';

export class NextJSFramework implements FrameworkType {
  command = this.options.command;

  constructor(private readonly options: MonoCloudCliOptions) {}

  async createEnvironment(): Promise<void> {
    await this.prompt();
    await this.createEnvFile();
    await this.createAuthHandler();
  }

  async installDependencies(): Promise<void> {
    const packageName = '@monocloud/nextjs-auth';

    try {
      const packageJson = JSON.parse(readFileSync('package.json').toString());

      if (packageJson.dependencies?.[packageName]) {
        return;
      }
    } catch (error) {
      return;
    }

    const version = this.options.sdkVersion;

    const packageWithVersion = `${packageName}${version ? `@${version}` : ''}`;

    const installPackage = await prompts({
      type: 'toggle',
      name: 'value',
      message: `Install ${blue(packageWithVersion)} package?`,
      active: 'Yes',
      inactive: 'No',
      initial: true,
      onState,
    });

    if (!installPackage.value) {
      return;
    }

    const [pkgMgr, installCommand] = getPkgMgr();

    await execCommand(pkgMgr, [installCommand, packageWithVersion]);
  }

  private async prompt(): Promise<void> {
    if (!this.options.issuer) {
      const issuer = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter ${blue('Issuer Url')}`,
        onState,
        validate: (value: string) => validate({ issuer: value }),
      });

      this.options.issuer = issuer.value;
    }

    if (!this.options.clientId) {
      const clientId = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter ${blue('Client Id')}`,
        validate: (value: string) => validate({ clientId: value }),
        onState,
      });

      this.options.clientId = clientId.value;
    }

    if (!this.options.clientSecret) {
      const clientSecret = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter ${blue('Client Secret')}`,
        validate: (value: string) => validate({ clientSecret: value }),
        onState,
      });

      this.options.clientSecret = clientSecret.value;
    }

    if (!this.options.scopes) {
      const scopes = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter ${blue('Scopes')} ${gray('(space seperated)')}`,
        initial: 'openid profile email',
        separator: ' ',
        validate: (value: string) => validate({ scopes: value }),
        onState,
      });

      this.options.scopes = scopes.value;
    }

    if (!this.options.appUrl) {
      const appUrl = await prompts({
        type: 'text',
        name: 'value',
        message: `Enter ${blue('App Url')}`,
        initial: 'http://localhost:3000',
        validate: (value: string) => validate({ appUrl: value }),
        onState,
      });

      this.options.appUrl = appUrl.value;
    }

    if (!this.options.cookieSecret) {
      const generateCookieSecret = await prompts({
        type: 'toggle',
        name: 'value',
        message: `Generate ${blue('Cookie Secret')}?`,
        active: 'Yes',
        inactive: "I'll enter my own",
        initial: true,
        onState,
      });

      if (generateCookieSecret.value) {
        this.options.cookieSecret = randomBytes(32).toString('base64');
      } else {
        const secret = await prompts({
          type: 'text',
          name: 'value',
          message: `Enter your ${blue('Cookie Secret')}`,
          validate: (value: string) => validate({ cookieSecret: value }),
          onState,
        });

        this.options.cookieSecret = secret.value;
      }
    }
  }

  private async createEnvFile(): Promise<void> {
    const newEnv: Record<string, string | undefined> = {
      MONOCLOUD_AUTH_ISSUER: this.options.issuer?.trim(),
      MONOCLOUD_AUTH_CLIENT_ID: this.options.clientId?.trim(),
      MONOCLOUD_AUTH_CLIENT_SECRET: this.options.clientSecret?.trim(),
      MONOCLOUD_AUTH_SCOPES: this.options.scopes
        ?.split(' ')
        .filter(x => x.trim().length > 0)
        .join(' '),
      MONOCLOUD_AUTH_APP_URL: this.options.appUrl?.trim(),
      MONOCLOUD_AUTH_COOKIE_SECRET: this.options.cookieSecret?.trim(),
    };

    const directory = readdirSync('./');

    const envFiles = directory.filter(x => x.startsWith('.env'));

    let envFile;

    if (envFiles.length > 0) {
      const choices = envFiles.map(x => ({ title: x, value: x }));

      choices.push({ title: 'Create new File', value: 'newfile' });

      const initial = envFiles.findIndex(
        x => x.includes('dev') || x.includes('local') || x.includes('test')
      );

      const envFileToWrite = await prompts({
        type: 'select',
        name: 'value',
        message: `Select the ${blue('.env')} file where you want to save the environment variables`,
        choices,
        initial: initial === -1 ? 0 : initial,
        onState,
      });

      if (envFileToWrite.value !== 'newfile') {
        envFile = envFileToWrite.value;
      }
    }

    if (!envFile) {
      const customEnvFileName = await prompts({
        type: 'text',
        name: 'value',
        message: `Specify the ${blue('name of the Env file')} where the environment variables will be stored.`,
        initial: envFiles.includes('.env') ? undefined : '.env',
        validate: (value: string) =>
          value.trim().length > 0
            ? true
            : 'Env file name should be a non empty string',
        onState,
      });

      envFile = customEnvFileName.value;
    }

    if (!existsSync(envFile)) {
      closeSync(openSync(envFile, 'w'));
    }

    const envPairs = readFileSync(envFile)
      .toString()
      .split(EOL)
      .filter(x => x.trim().length > 0);

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < envPairs.length; i++) {
      const [existingKey] = envPairs[i].split('=');
      if (existingKey.startsWith('MONOCLOUD') && newEnv[existingKey]) {
        envPairs[i] = `${existingKey}=${newEnv[existingKey]}`;
        newEnv[existingKey] = undefined;
      }
    }

    for (const [k, v] of Object.entries(newEnv)) {
      if (v) {
        envPairs.push(`${k}=${v}`);
      }
    }

    writeFileSync(envFile, envPairs.join(EOL));
  }

  private async createAuthHandler(): Promise<void> {
    const isPageRouter =
      existsSync('pages/_app.js') ||
      existsSync('pages/_app.tsx') ||
      existsSync('src/pages/_app.js') ||
      existsSync('src/pages/_app.tsx');

    const isAppRouter =
      existsSync('app/page.js') ||
      existsSync('app/page.tsx') ||
      existsSync('src/app/page.js') ||
      existsSync('src/app/page.tsx');

    if (!isPageRouter && !isAppRouter) {
      return;
    }

    let fileName = '';
    let directory = '';
    let content = '';

    if (isAppRouter) {
      directory = 'app/api/auth/[...monocloud]/';
      fileName = 'route';
      content = `
import { monoCloudAuth } from '@monocloud/nextjs-auth';

export const GET = monoCloudAuth();`.trim();
    }

    if (isPageRouter) {
      directory = 'pages/api/auth/';
      fileName = '[...monocloud]';
      content = `
import { monoCloudAuth } from '@monocloud/nextjs-auth';

export default monoCloudAuth();`.trim();
    }

    if (existsSync('tsconfig.json')) {
      fileName += '.ts';
    } else {
      fileName += '.js';
    }

    if (existsSync('src')) {
      directory = 'src/' + directory;
    }

    const fullPath = join(directory, fileName);

    if (existsSync(fullPath)) {
      return;
    }

    const createAuthHandler = await prompts({
      type: 'toggle',
      name: 'value',
      message: `Create ${blue('MonoCloud Authentication Handler')}?`,
      active: 'Yes',
      inactive: 'No',
      initial: true,
      onState,
    });

    if (!createAuthHandler.value) {
      return;
    }

    mkdirSync(directory, { recursive: true });

    writeFileSync(fullPath, content);
  }
}
