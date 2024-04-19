import { MonoCloudCommand } from '../common';

export interface FrameworkType {
  command: MonoCloudCommand;
  createEnvironment(): Promise<void> | void;
  installDependencies(): Promise<void> | void;
}
