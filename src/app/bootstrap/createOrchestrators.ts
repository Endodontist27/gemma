import type {
  AppOrchestrators,
  AppPorts,
  AppRepositories,
  AppServices,
  AppUseCases,
} from '@app/bootstrap/types';

const loadCreateOrchestrators = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['../../shared/config/bootstrap/', 'createOrchestrators'].join('');
  return (
    runtimeRequire(modulePath) as typeof import('@shared/config/bootstrap/createOrchestrators')
  ).createOrchestrators;
};

export const createOrchestrators = (
  repositories: AppRepositories,
  ports: AppPorts,
  services: AppServices,
  useCases: AppUseCases,
): AppOrchestrators => loadCreateOrchestrators()(repositories, ports, services, useCases);
