import '../generated/gql';
import { app } from '@drumr/framework-frontend';
import { configureApp } from './config/appConfig';

configureApp(app);

export * from '@drumr/framework-frontend/runtime';
