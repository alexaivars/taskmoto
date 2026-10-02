import { get, post, route } from 'remix/routes';
export const routes = route({
  assets: get('/assets/*path'),
  home: get('/'),
  login: get('/login'),
  signup: get('/signup'),
  signIn: post('/login'),
  register: post('/signup'),
  logout: post('/logout'),
  report: post('/entries'),
  remove: post('/entries/:id/delete'),
  graphql: post('/graphql'),
  passkeys: post('/passkeys/:ceremony/:step'),
});
