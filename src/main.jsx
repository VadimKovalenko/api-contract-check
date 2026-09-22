import { createRoot } from 'react-dom/client';
import { applyColorTheme } from './colors';
import { App } from './components/App';
import './styles.css';

applyColorTheme();

createRoot(document.getElementById('root')).render(<App />);
