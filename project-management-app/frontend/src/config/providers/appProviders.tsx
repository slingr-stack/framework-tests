import { ApolloProvider } from '@apollo/client/react';
import { AppRegistry } from '@drumr/framework-frontend';
import React from 'react';
import { FancyAlertProvider } from '../../shared/providers/FancyAlertProvider';
import { client } from './apolloClient';

export function registerProviders(app: AppRegistry) {
  app.registerProviders(({ children }) => (
    <React.StrictMode>
      <ApolloProvider client={client}>
        <FancyAlertProvider>{children}</FancyAlertProvider>
      </ApolloProvider>
    </React.StrictMode>
  ));
}
