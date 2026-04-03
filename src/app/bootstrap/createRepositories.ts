import type { AppDatabase } from '@infrastructure/database/client';
import type { AppRepositories } from '@app/bootstrap/types';

const loadCreateRepositories = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['../../shared/config/bootstrap/', 'createRepositories'].join('');
  return (
    runtimeRequire(modulePath) as typeof import('@shared/config/bootstrap/createRepositories')
  ).createRepositories;
};

export const createRepositories = (database: AppDatabase): AppRepositories =>
  loadCreateRepositories()(database);
