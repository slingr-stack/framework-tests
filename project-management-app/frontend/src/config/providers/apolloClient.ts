/**
 * Apollo Client bootstrap – exports the framework-managed GraphQL client.
 *
 * The `client` export can be used anywhere that needs direct access to the
 * Apollo client instance outside of the React tree (e.g. in lifecycle hooks
 * or imperative code). Inside React components prefer `useApolloClient()` or
 * the query/mutation hooks from `@apollo/client/react`.
 *
 * In `app.tsx` this client is registered as the application-wide Apollo
 * provider via `defineApp({ providers })`.
 */
import { getGraphQLClient } from '@drumr/framework-frontend';

/**
 * The singleton Apollo client instance managed by the framework.
 */
export const client = getGraphQLClient();
