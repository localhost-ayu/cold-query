import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Desktop } from '@/os/Desktop';

import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* LazyMotion com domAnimation carrega só animação e saída (sem layout nem
        arrasto), e os componentes usam `m.` em vez de `motion.`; strict avisa se
        algum `motion.` escapar. reducedMotion="user" segue o sistema. */}
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <Desktop />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);
