// Kurze Hinweise unten (Toast), optional mit „Rückgängig“. Kein Dialog, verschwindet von selbst.
import { el } from '../ui.js';

export function zeigeHinweis(text, { rueckgaengig = null, dauer = 5000 } = {}) {
  document.querySelector('.hinweis-toast')?.remove();
  const toast = el('div', { class: 'hinweis-toast', role: 'status' }, el('span', {}, text));
  const weg = () => { toast.classList.add('weg'); setTimeout(() => toast.remove(), 250); };
  if (rueckgaengig) {
    toast.append(el('button', { class: 'knopf-text', type: 'button', onclick: () => { weg(); rueckgaengig(); } }, 'Rückgängig'));
  }
  document.body.append(toast);
  setTimeout(weg, dauer);
}
