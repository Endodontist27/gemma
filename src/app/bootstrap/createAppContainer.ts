import type { AppContainer } from '@app/bootstrap/types';

const loadCreateAppContainer = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['../../shared/config/bootstrap/', 'createAppContainer'].join('');
  return (
    runtimeRequire(modulePath) as typeof import('@shared/config/bootstrap/createAppContainer')
  ).createAppContainer;
};

export const createAppContainer = (): AppContainer => loadCreateAppContainer()();
