import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

document.title = 'React Reality Lab — evidence console';
createRoot(document.querySelector('#viewer-root')).render(<App />);
