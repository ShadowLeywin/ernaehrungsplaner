// Beispielprofil für Tests: drei Tagestypen, Morning Stack und Supplements.
// Bewusst neutrale Beispielwerte, keine echten Nutzerdaten.
import { standardProfil, neuerTagestyp } from '../js/logic/profil.js';

export function beispielProfil() {
  const profil = standardProfil();
  return {
    ...profil,
    koerper: { geschlecht: 'm', alter: 22, groesseCm: 180, gewichtKg: 75 },
    aktivitaeten: [{ id: 'gym', name: 'Gym', kcal: 300 }, { id: 'rad', name: 'Rad', kcal: 200 }],
    tagestypen: [
      neuerTagestyp('training', 'Trainingstag', { basis: true, aktivitaeten: ['gym', 'rad'], kcal: 2875, protein: 175, kh: 375, fett: 75, obstG: 300 }),
      neuerTagestyp('leicht', 'Leichter Tag', { kcal: 2600, protein: 175, kh: 328, fett: 65 }),
      neuerTagestyp('rest', 'Ruhetag', { kcal: 2400, protein: 175, kh: 293, fett: 59 }),
    ],
    woche: [
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'training', notiz: 'Beine' },
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'training', notiz: '' },
      { tagestyp: 'leicht', notiz: '' },
      { tagestyp: 'rest', notiz: '' },
    ],
    morningStack: {
      aktiv: true,
      name: 'Morning Stack',
      zutaten: [
        { lebensmittelId: 'rote_bete_saft', gramm: 250 },
        { lebensmittelId: 'honig', gramm: 8 },
        { lebensmittelId: 'olivenoel', gramm: 4.5 },
        { lebensmittelId: 'ingwer', gramm: 5 },
      ],
    },
    supplements: [
      { id: 'multi', name: 'Multivitamin', dosis: '1 Portion', aktiv: true, naehrwerte: { vitD: 25, zink: 20, eisen: 18 } },
      { id: 'omega3', name: 'Omega-3', dosis: '1 Portion', aktiv: true, naehrwerte: { kcal: 27, fett: 3, omega3: 2.1, epaDha: 2100 } },
      { id: 'kreatin', name: 'Kreatin', dosis: '5 g', aktiv: true, zutaten: [{ lebensmittelId: 'kreatin', gramm: 5 }] },
      { id: 'flohsamen', name: 'Flohsamenschalen', dosis: '5 g', aktiv: true, zutaten: [{ lebensmittelId: 'flohsamenschalen', gramm: 5 }] },
    ],
  };
}
