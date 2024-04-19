import Joi from 'joi';
import type { MonoCloudCliOptions } from './monocloud-cli-options';
import { Framework, MonoCloudCommand } from './common';

const stringOptional = Joi.string().trim();

const frameworks = Object.values(Framework);
const commands = Object.values(MonoCloudCommand);

const optionsSchema: Joi.ObjectSchema<Partial<MonoCloudCliOptions>> =
  Joi.object({
    command: stringOptional
      .valid(...commands)
      .error(
        new Error(
          `Unsupported command. Supported commands: ${commands.join(',')}`
        )
      ),
    framework: stringOptional
      .valid(...frameworks)
      .error(
        new Error(
          `Unsupported framework. Supported frameworks: ${frameworks.join(',')}`
        )
      ),
    issuer: stringOptional
      .uri({ scheme: 'https' })
      .error(new Error('Issuer should be a valid "https" url')),
    clientId: stringOptional
      .min(1)
      .error(new Error('Client Id should be a non empty string')),
    clientSecret: stringOptional
      .min(1)
      .error(new Error('Client Secret should be a non empty string')),
    scopes: stringOptional
      .pattern(/\bopenid\b/)
      .error(new Error('Scope must contain openid')),
    appUrl: stringOptional
      .uri()
      .error(new Error('App Url should be a valid url')),
    cookieSecret: stringOptional
      .min(8)
      .error(new Error('Cookie Secret should be atleast 8 characters long')),
  }).required();

export const validate = (options: Partial<MonoCloudCliOptions>) => {
  const { error } = optionsSchema.validate(options, {
    abortEarly: true,
  });

  return error ? error.message : true;
};
