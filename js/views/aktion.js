// Schnellaktionen vom App-Symbol (lange drücken): #/aktion/wasser | workout | gewicht
import { el } from '../ui.js';
import { holeProfil, holeTag, speichereTag } from '../state.js';
import { datumSchluessel } from '../logic/ziele.js';
import { zeigeHinweis } from './hinweis.js';

export const aktion = {
  titel: 'FORGEBORN',
  render() {
    const was = location.hash.split('/')[2];
    ausfuehren(was);
    return el('p', { class: 'leise' }, '…');
  },
};

async function ausfuehren(was) {
  if (was === 'wasser') {
    const [profil, tag] = await Promise.all([holeProfil(), holeTag(datumSchluessel(new Date()))]);
    const ml = profil.wasser.presetsMl[0] ?? 250;
    tag.wasser.push({ ml, zeit: new Date().toISOString() });
    await speichereTag(tag);
    location.replace('#/lager');
    zeigeHinweis(`+${ml} ml Wasser eingetragen`, {
      rueckgaengig: async () => { tag.wasser.pop(); await speichereTag(tag); location.reload(); },
    });
  } else if (was === 'workout') {
    sessionStorage.setItem('schnellstartWorkout', 'ja');
    location.replace('#/training');
  } else if (was === 'gewicht') {
    sessionStorage.setItem('fokusGewicht', 'ja');
    location.replace('#/heute');
  } else {
    location.replace('#/lager');
  }
}
