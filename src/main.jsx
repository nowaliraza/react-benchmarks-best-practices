const params = new URLSearchParams(location.search);
const scenarioId = params.get('scenario');
const rootElement = document.querySelector('#app-root');

if (scenarioId) {
  rootElement.id = 'measured-root';
  import('./measured.jsx');
} else {
  rootElement.id = 'viewer-root';
  import('./viewer/bootstrap.jsx');
}
