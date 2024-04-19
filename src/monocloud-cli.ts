import { Command } from 'commander';
import { blue, green } from 'picocolors';
import prompts from 'prompts';
import { MonoCloudCliOptions } from './monocloud-cli-options';
import packageJson from '../package.json';
import { Framework, MonoCloudCommand } from './common';
import { validate } from './validation';
import { NextJSFramework } from './frameworks/nextjs-framework';
import { FrameworkType as FrameworkType } from './frameworks/framework-type';
import { existsSync } from 'fs';

let command = '' as unknown as MonoCloudCommand;

const parsedCli = new Command(packageJson.name)
  .version(packageJson.version)
  .argument('<command>', 'Only "init" is supported')
  .usage(`${green('<command>')} [options]`)
  .action(name => {
    command = name;
  })
  .option(
    '--framework <framework>',
    `

  Framwork you want to initialize for. Currently, only nextjs is supported.
`
  )
  .option(
    '--issuer <your-domain>',
    `

    Refers to the domain of your MonoCloud project.
`
  )
  .option(
    '--clientId <your-client-id>',
    `

    Refers to your MonoCloud application's unique client ID. Replace <your-client-id> with the Client ID provided by MonoCloud.
`
  )
  .option(
    '--clientSecret <your-client-secret>',
    `

    Refers to the MonoCloud application's secret key. Replace <your-client-secret> with the client secret obtained from the previous step.
`
  )
  .option(
    '--scopes <comma-separated-scopes>',
    `

    Refers to the scopes that your application requires during authentication. Example: openid,profile,email.
`,
    (value: string): string =>
      value
        .trim()
        .split(',')
        .map(x => x.trim())
        .filter(x => x.length > 0)
        .join(' ')
  )
  .option(
    '--appUrl <appUrl>',
    `

    This is the base url of the NextJS server.
`
  )
  .option(
    '--cookieSecret <cookieSecret>',
    `

    This refers to a secret key used to encrypt the user's session cookie. You should generate a secure and random secret key and set the value here.
`
  )
  .option(
    '--sdkVersion <sdkVersion>',
    `

    The framework sdk version to install.
`
  )
  .allowUnknownOption()
  .parse(process.argv);

export const getFramework = async (): Promise<FrameworkType> => {
  const options = new MonoCloudCliOptions({
    ...parsedCli.opts(),
    command,
  });

  if (!options.framework) {
    const framework = await prompts({
      type: 'select',
      name: 'value',
      message: `Choose a ${blue('framework')}`,
      choices: [{ title: 'NextJS', value: Framework.NextJS }],
      validate: value => validate({ framework: value }),
      initial: 0,
    });

    options.framework = framework.value;
  }

  switch (options.framework) {
    case Framework.NextJS:
      if (!existsSync('package.json')) {
        throw new Error('Invalid NextJS repository. No "package.json" found.');
      }
      return new NextJSFramework(options);

    default:
      throw new Error('Unsupported Framework');
  }
};
