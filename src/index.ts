#! /usr/bin/env node

import { MonoCloudCommand } from './common';
import { getFramework } from './monocloud-cli';

(async () => {
  const framework = await getFramework();

  switch (framework.command) {
    case MonoCloudCommand.Init:
      await framework.createEnvironment();
      await framework.installDependencies();
      return;

    default:
      throw new Error('Unknown Command');
  }
})();
