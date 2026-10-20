import { PREFERENCES_STORAGE_KEY } from '@/store/preferences-store';

/**
 * Roda no <head>, antes da primeira pintura, para a página não piscar no tema
 * errado. É texto puro porque vai inline no HTML estático.
 */
export const themeScript = `(function(){try{var t='system';var s=localStorage.getItem(${JSON.stringify(
  PREFERENCES_STORAGE_KEY,
)});if(s){var p=JSON.parse(s);if(p&&p.state&&p.state.theme)t=p.state.theme}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})();`;
