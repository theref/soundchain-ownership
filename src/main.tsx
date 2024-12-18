import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initialize } from '@nucypher/taco';

initialize().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});