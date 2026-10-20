/**
 * Efeitos sonoros sintetizados com a Web Audio API: nenhum arquivo de áudio.
 * Cada som é uma sequência curta de notas; o navegador só libera o áudio depois
 * do primeiro clique ou tecla, então antes disso play() não faz nada.
 */
export type SoundId =
  | 'click'
  | 'open'
  | 'close'
  | 'minimize'
  | 'mail'
  | 'error'
  | 'success'
  | 'failure';

interface Note {
  /** Frequência inicial e final em Hz (glissando quando diferentes). */
  from: number;
  to: number;
  /** Início relativo e duração, em segundos. */
  at: number;
  length: number;
  wave: OscillatorType;
  gain: number;
}

const note = (
  from: number,
  to: number,
  at: number,
  length: number,
  wave: OscillatorType = 'sine',
  gain = 1,
): Note => ({
  from,
  to,
  at,
  length,
  wave,
  gain,
});

const sounds: Record<SoundId, Note[]> = {
  click: [note(240, 190, 0, 0.06, 'triangle', 0.6)],
  open: [note(360, 620, 0, 0.09)],
  close: [note(520, 300, 0, 0.08)],
  minimize: [note(440, 220, 0, 0.12, 'sine', 0.8)],
  mail: [note(660, 660, 0, 0.1), note(880, 880, 0.11, 0.16)],
  error: [
    note(196, 150, 0, 0.14, 'square', 0.35),
    note(150, 120, 0.12, 0.16, 'square', 0.3),
  ],
  success: [
    note(523, 523, 0, 0.09),
    note(659, 659, 0.09, 0.09),
    note(784, 784, 0.18, 0.22),
  ],
  failure: [
    note(392, 392, 0, 0.14, 'triangle'),
    note(311, 311, 0.15, 0.14, 'triangle'),
    note(262, 240, 0.3, 0.3, 'triangle'),
  ],
};

const PEAK = 0.08;

let context: AudioContext | null = null;
let unlocked = false;
let settings = { enabled: true, volume: 0.6 };

export function configureAudio(next: {
  enabled: boolean;
  volume: number;
}): void {
  settings = next;
}

function unlock(): void {
  unlocked = true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

export function play(soundId: SoundId): void {
  if (!unlocked || !settings.enabled || settings.volume <= 0) return;
  try {
    context ??= new AudioContext();
  } catch {
    return;
  }
  const now = context.currentTime;
  for (const step of sounds[soundId]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + step.at;
    const end = start + step.length;
    const peak = PEAK * settings.volume * step.gain;

    oscillator.type = step.wave;
    oscillator.frequency.setValueAtTime(step.from, start);
    if (step.to !== step.from)
      oscillator.frequency.exponentialRampToValueAtTime(step.to, end);
    // Envelope curto: sobe em 10 ms e decai até quase zero (rampa exponencial não aceita 0).
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}
