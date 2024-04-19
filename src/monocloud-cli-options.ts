import { Framework, MonoCloudCommand } from './common';
import { validate } from './validation';

export class MonoCloudCliOptions {
  command: MonoCloudCommand;

  framework: Framework;

  sdkVersion?: string;

  issuer?: string;

  clientId?: string;

  clientSecret?: string;

  scopes?: string;

  appUrl?: string;

  cookieSecret?: string;

  constructor(options: MonoCloudCliOptions) {
    const error = validate(options) as string & true;

    if (typeof error === 'string') {
      throw new Error(error);
    }

    this.command = options.command;
    this.framework = options.framework;
    const sdkVersion = options.sdkVersion?.trim();
    if (sdkVersion) {
      this.sdkVersion = sdkVersion;
    }
    this.issuer = options.issuer;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.scopes = options.scopes;
    this.appUrl = options.appUrl;
    this.cookieSecret = options.cookieSecret;
  }
}
