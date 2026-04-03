import type { AppDatabase } from '@infrastructure/database/client';
import type { AppRepositories, AppServices } from '@app/bootstrap/types';

const loadCreateServices = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['../../shared/config/bootstrap/', 'createServices'].join('');
  return (runtimeRequire(modulePath) as typeof import('@shared/config/bootstrap/createServices'))
    .createServices;
};

export const createServices = (database: AppDatabase, repositories: AppRepositories): AppServices =>
  loadCreateServices()(database, repositories);
