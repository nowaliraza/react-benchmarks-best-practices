import { isMeasuredRealm } from './realm.js';

const rootElement = document.querySelector('#app-root');

if (isMeasuredRealm(location.search)) {
  rootElement.id = 'measured-root';
  import('./measured.jsx');
} else {
  rootElement.id = 'viewer-root';
  import('./viewer/bootstrap.jsx');
}
