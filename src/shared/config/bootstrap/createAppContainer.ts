import type { AppContainer } from '@app/bootstrap/types';
import { createDatabaseClient } from '@infrastructure/database/client';
import { DrizzleDatabaseInitializer } from '@infrastructure/database/DrizzleDatabaseInitializer';
import { DrizzleTransactionRunner } from '@infrastructure/database/DrizzleTransactionRunner';
import { FileSelectedSessionStore } from '@infrastructure/local-storage/FileSelectedSessionStore';

import { createOrchestrators } from '@shared/config/bootstrap/createOrchestrators';
import { createRepositories } from '@shared/config/bootstrap/createRepositories';
import { createServices } from '@shared/config/bootstrap/createServices';
import { createUseCases } from '@shared/config/bootstrap/createUseCases';

export const createAppContainer = (): AppContainer => {
  const databaseClient = createDatabaseClient();
  const repositories = createRepositories(databaseClient.drizzle);
  const ports = {
    selectedSessionStore: new FileSelectedSessionStore(),
    databaseInitializer: new DrizzleDatabaseInitializer(databaseClient.drizzle),
    transactionRunner: new DrizzleTransactionRunner(databaseClient.drizzle),
  };
  const services = createServices(databaseClient.drizzle, repositories);
  const useCases = createUseCases(repositories, services, ports);
  const orchestrators = createOrchestrators(repositories, ports, services, useCases);

  return {
    databaseClient,
    repositories,
    ports,
    services,
    useCases,
    orchestrators,
  };
};
