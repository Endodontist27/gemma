import type { AppPorts, AppRepositories, AppServices, AppUseCases } from '@app/bootstrap/types';

const loadCreateUseCases = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['../../shared/config/bootstrap/', 'createUseCases'].join('');
  return (runtimeRequire(modulePath) as typeof import('@shared/config/bootstrap/createUseCases'))
    .createUseCases;
};

export const createUseCases = (
  repositories: AppRepositories,
  services: AppServices,
  ports: AppPorts,
): AppUseCases => loadCreateUseCases()(repositories, services, ports);
