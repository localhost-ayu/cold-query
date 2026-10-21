import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Desktop } from '@/os/Desktop';

import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Desktop />
  </StrictMode>,
);
