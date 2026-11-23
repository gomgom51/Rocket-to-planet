// Bodies of the solar system and every sentence the game says or shows, in
// French. The English sentences are in lang/en.js (same keys); i18n.js swaps
// them in when the game is in English.
// Feel free to edit the sentences: they are read aloud by the phone's voice.

export const PLANETS = {
  mercury: {
    id: 'mercury', name: 'Mercure', tilt: 0.03, spin: 0.05,
    orbit: 1.75, mapSize: 0.26, size: 0.38,
    hint: 'Mercure est toute petite et grise, avec plein de cratères.',
    fact: 'Mercure est la planète la plus proche du Soleil.',
    activity: { type: 'facts' },
    facts: [
      'Mercure fait le tour du Soleil très vite : une année y dure seulement 88 jours.',
      'Le jour, il fait très chaud sur Mercure. La nuit, il fait très très froid.',
      'Mercure n’a pas de lune.',
    ],
  },
  venus: {
    id: 'venus', name: 'Vénus', tilt: 0.05, spin: 0.02,
    orbit: 2.4, mapSize: 0.38, size: 0.95,
    atmosphere: { color: [1.0, 0.86, 0.6], halo: 0.9, haze: 0.5 },
    hint: 'Vénus est toute jaune, cachée sous ses nuages.',
    fact: 'Vénus est la planète la plus chaude. Il y fait encore plus chaud que dans un four !',
    activity: { type: 'facts' },
    facts: [
      'Vénus tourne à l’envers, dans l’autre sens que la Terre.',
      'Sur Vénus, une journée dure plus longtemps qu’une année !',
      'Vénus est la planète qui brille le plus dans notre ciel, le soir et le matin.',
    ],
  },
  earth: {
    id: 'earth', name: 'la Terre', short: 'Terre', tilt: 0.41, spin: 0.08, face: 0.54,
    orbit: 3.1, mapSize: 0.40, size: 1.0,
    atmosphere: { color: [0.35, 0.62, 1.0], halo: 1.2, haze: 0.8 },
    hint: 'La Terre est bleue et verte, avec des nuages blancs.',
  },
  mars: {
    id: 'mars', name: 'Mars', tilt: 0.44, spin: 0.08,
    orbit: 3.85, mapSize: 0.31, size: 0.53,
    atmosphere: { color: [1.0, 0.62, 0.42], halo: 0.35, haze: 0.25 },
    hint: 'Mars est la planète rouge.',
    fact: 'Mars est rouge, car son sol est couvert de poussière couleur rouille.',
    activity: { type: 'rover' },
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter', tilt: 0.05, spin: 0.12, face: 0.375,
    orbit: 5.0, mapSize: 0.78, size: 11.2,
    atmosphere: { color: [1.0, 0.9, 0.78], halo: 0.25, haze: 0.2 },
    hint: 'Jupiter est la plus grosse, avec des bandes et une grande tache rouge.',
    fact: 'Jupiter est la plus grosse planète. Toutes les autres planètes pourraient tenir dedans !',
    activity: { type: 'spot', u: 0.369, v: 0.605, radius: 0.3, label: 'la grande tache rouge' },
  },
  saturn: {
    id: 'saturn', name: 'Saturne', tilt: 0.47, spin: 0.11,
    orbit: 6.2, mapSize: 0.66, size: 9.4, rings: true,
    atmosphere: { color: [1.0, 0.92, 0.75], halo: 0.25, haze: 0.2 },
    hint: 'Saturne a de magnifiques anneaux.',
    fact: 'Les anneaux de Saturne sont faits de morceaux de glace et de cailloux.',
    activity: { type: 'rings' },
  },
  uranus: {
    id: 'uranus', name: 'Uranus', tilt: 1.7, spin: 0.07,
    orbit: 7.3, mapSize: 0.5, size: 4.0,
    atmosphere: { color: [0.62, 0.92, 1.0], halo: 0.6, haze: 0.45 },
    hint: 'Uranus est toute bleu-vert, très pâle.',
    fact: 'Uranus tourne couchée sur le côté, comme une roue qui roule.',
    activity: { type: 'facts' },
    facts: [
      'Uranus a vingt-huit lunes.',
      'Uranus est très froide : c’est une géante de glace.',
      'Uranus a aussi des anneaux, mais ils sont très fins.',
    ],
  },
  neptune: {
    id: 'neptune', name: 'Neptune', tilt: 0.49, spin: 0.07, face: 0.54,
    orbit: 8.3, mapSize: 0.49, size: 3.9,
    atmosphere: { color: [0.35, 0.55, 1.0], halo: 0.7, haze: 0.5 },
    hint: 'Neptune est d’un bleu très profond.',
    fact: 'Neptune est la planète la plus loin du Soleil. Il y souffle des vents très forts !',
    activity: { type: 'spot', u: 0.54, v: 0.6, radius: 0.3, label: 'la tache sombre' },
  },
  // ---- bonus destinations (unlocked after visiting the 7 planets) ----
  moon: {
    id: 'moon', name: 'la Lune', short: 'Lune', kind: 'moon', parent: 'earth', tilt: 0.03, spin: 0.03, face: 0.25,
    orbit: 3.1, mapSize: 0.17, size: 0.27,
    hint: 'La Lune est grise, avec de grandes taches sombres et plein de cratères.',
    fact: 'La Lune tourne autour de la Terre. Des astronautes ont déjà marché dessus !',
    activity: { type: 'flag' },
  },
  europa: {
    id: 'europa', name: 'Europe', kind: 'moon', parent: 'jupiter', tilt: 0.02, spin: 0.04,
    orbit: 5.0, mapSize: 0.17, size: 0.25,
    hint: 'Europe est une lune de glace, toute claire avec des traits marron.',
    fact: 'Europe est une lune de Jupiter. Sous sa glace, il y a peut-être un grand océan !',
    activity: { type: 'facts' },
    facts: [
      'Europe est un peu plus petite que notre Lune.',
      'Sa glace est toute craquelée, comme une coquille d’œuf.',
      'Sous la glace d’Europe, il y a sans doute un océan d’eau salée.',
    ],
  },
  titan: {
    id: 'titan', name: 'Titan', kind: 'moon', parent: 'saturn', tilt: 0.05, spin: 0.03,
    orbit: 6.2, mapSize: 0.2, size: 0.4,
    atmosphere: { color: [1.0, 0.66, 0.3], halo: 1.3, haze: 1.0 },
    hint: 'Titan est une lune toute orange, cachée dans le brouillard.',
    fact: 'Titan est la plus grande lune de Saturne. Elle a des lacs et des rivières !',
    activity: { type: 'facts' },
    facts: [
      'Titan est plus grande que la planète Mercure !',
      'Sur Titan, il pleut, mais ce n’est pas de l’eau : c’est du méthane.',
      'Une petite sonde appelée Huygens s’est posée sur Titan.',
    ],
  },
  pluto: {
    id: 'pluto', name: 'Pluton', kind: 'dwarf', tilt: 0.3, spin: 0.03, face: 0.5,
    orbit: 9.3, mapSize: 0.2, size: 0.19,
    hint: 'Pluton est petite, avec un grand cœur tout clair.',
    fact: 'Pluton est une planète naine, très loin et très froide. Elle a un grand cœur de glace !',
    activity: { type: 'spot', u: 0.51, v: 0.39, radius: 0.4, label: 'le grand cœur' },
  },
  comet: {
    id: 'comet', name: 'la comète', short: 'Comète', kind: 'comet', tilt: 0.2, spin: 0.06,
    orbit: 4.6, mapSize: 0.16, size: 0.1,
    hint: 'La comète a une longue queue qui brille.',
    fact: 'Une comète est une grosse boule de glace et de poussière. Près du Soleil, elle fait une longue queue !',
    activity: { type: 'facts' },
    facts: [
      'La queue d’une comète est toujours du côté opposé au Soleil.',
      'La queue d’une comète peut être plus longue que des millions de kilomètres !',
      'La comète de Halley revient près de la Terre tous les soixante-seize ans.',
    ],
  },
};

// Body rotation that brings texture coordinate `u` (0..1) in front of a camera on +Z.
export const faceRotation = (def) => Math.PI / 2 - 2 * Math.PI * ((def && def.face) || 0.5);

// Order from the Sun (used for the map) and the destinations.
export const ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const DESTINATIONS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const BONUS = ['moon', 'europa', 'titan', 'pluto', 'comet'];
export const ALL_BODIES = ORDER.concat(BONUS);

export const NUMBERS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// "a, b et c"
const list = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}` : names[0]);

// ---------------------------------------------------------------------------
// Questions asked in front of a planet: "does it have rings?" etc.
// yes: bodies for which the answer is yes; avoid: bodies for which the
// question would be confusing (never asked about them).
// ---------------------------------------------------------------------------
export const FEATURES = [
  { id: 'rings', q: 'Est-ce qu’elle a de grands anneaux ?', yes: ['saturn'], avoid: ['uranus'], isYes: 'Elle a de grands anneaux.', isNo: 'Elle n’a pas de grands anneaux.' },
  { id: 'red', q: 'Est-ce qu’elle est rouge ?', yes: ['mars'], avoid: ['jupiter', 'pluto', 'titan'], isYes: 'Elle est toute rouge.', isNo: 'Elle n’est pas rouge.' },
  { id: 'biggest', q: 'Est-ce que c’est la plus grosse planète ?', yes: ['jupiter'], avoid: ['saturn'], isYes: 'C’est la plus grosse de toutes !', isNo: 'Ce n’est pas la plus grosse.' },
  { id: 'deepblue', q: 'Est-ce qu’elle est bleu foncé ?', yes: ['neptune'], avoid: ['uranus', 'earth'], isYes: 'Elle est bleu foncé.', isNo: 'Elle n’est pas bleu foncé.' },
  { id: 'yellow', q: 'Est-ce qu’elle est toute jaune ?', yes: ['venus'], avoid: ['saturn', 'jupiter', 'titan', 'europa'], isYes: 'Elle est toute jaune.', isNo: 'Elle n’est pas toute jaune.' },
  { id: 'craters', q: 'Est-ce qu’elle est grise, avec des cratères ?', yes: ['mercury', 'moon'], avoid: ['europa', 'pluto', 'comet'], isYes: 'Elle est grise, avec plein de cratères.', isNo: 'Elle n’est pas grise.' },
  { id: 'stripes', q: 'Est-ce qu’elle a des rayures ?', yes: ['jupiter', 'saturn'], avoid: ['uranus', 'neptune', 'venus', 'titan'], isYes: 'Elle a de belles rayures.', isNo: 'Elle n’a pas de rayures.' },
  { id: 'paleblue', q: 'Est-ce qu’elle est bleu-vert, toute pâle ?', yes: ['uranus'], avoid: ['neptune', 'earth'], isYes: 'Elle est bleu-vert, toute pâle.', isNo: 'Elle n’est pas bleu-vert.' },
  { id: 'orange', q: 'Est-ce qu’elle est toute orange ?', yes: ['titan'], avoid: ['mars', 'venus', 'jupiter', 'saturn'], isYes: 'Elle est toute orange.', isNo: 'Elle n’est pas orange.' },
  { id: 'heart', q: 'Est-ce qu’elle a un grand cœur clair ?', yes: ['pluto'], avoid: [], isYes: 'Elle a un grand cœur clair.', isNo: 'Elle n’a pas de cœur.' },
  { id: 'tail', q: 'Est-ce qu’elle a une longue queue ?', yes: ['comet'], avoid: [], isYes: 'Elle a une longue queue.', isNo: 'Elle n’a pas de queue.' },
];

// Picture quizzes asked by the on-board computer during the trip.
export const QUIZZES = [
  { id: 'rings', q: 'Laquelle a de grands anneaux ?', answer: 'saturn', notWith: ['uranus'] },
  { id: 'red', q: 'Trouve la planète rouge !', answer: 'mars', notWith: ['jupiter'] },
  { id: 'biggest', q: 'Laquelle est la plus grosse ?', answer: 'jupiter', notWith: ['saturn'], scaled: true },
  { id: 'smallest', q: 'Laquelle est la plus petite ?', answer: 'mercury', notWith: ['mars'], scaled: true },
  { id: 'earth', q: 'Trouve la Terre, notre maison !', answer: 'earth', notWith: [] },
  { id: 'yellow', q: 'Laquelle est cachée sous des nuages jaunes ?', answer: 'venus', notWith: ['saturn', 'jupiter'] },
  { id: 'deepblue', q: 'Laquelle est bleu foncé ?', answer: 'neptune', notWith: ['earth', 'uranus'] },
  { id: 'target', q: (t) => `Trouve ${t.name} !`, answer: 'TARGET', notWith: [] },
];

// ---------------------------------------------------------------------------
// Rocket garage
// ---------------------------------------------------------------------------
export const COLORS = [
  { id: 'white', hex: '#f2f2ee', name: 'Blanc' },
  { id: 'silver', hex: '#b8bdc6', name: 'Argent' },
  { id: 'red', hex: '#d63340', name: 'Rouge' },
  { id: 'orange', hex: '#f08a2e', name: 'Orange' },
  { id: 'yellow', hex: '#f5c533', name: 'Jaune' },
  { id: 'green', hex: '#3fb36b', name: 'Vert' },
  { id: 'blue', hex: '#2f6fd8', name: 'Bleu' },
  { id: 'purple', hex: '#8a5cd6', name: 'Violet' },
  { id: 'pink', hex: '#f06aa8', name: 'Rose' },
  { id: 'black', hex: '#2a2a30', name: 'Noir' },
];

// Decorations painted on the rocket, unlocked with the stars collected.
export const DECORS = [
  { id: 'classic', name: 'Classique', stars: 0 },
  { id: 'none', name: 'Uni', stars: 0 },
  { id: 'stars', name: 'Étoiles', stars: 5 },
  { id: 'hearts', name: 'Cœurs', stars: 12 },
  { id: 'dots', name: 'Pois', stars: 20 },
  { id: 'planets', name: 'Planètes', stars: 30 },
  { id: 'rainbow', name: 'Arc-en-ciel', stars: 45 },
  { id: 'flames', name: 'Flammes', stars: 60 },
];

export const DEFAULT_STYLE = { body: 'white', fins: 'red', decor: 'classic', name: true };

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------
export const TEXT = {
  title: 'Voyage vers les planètes',
  choose: 'Où veux-tu aller ?',
  chosen: (p) => `${cap(p.name)} !`,
  go: (p) => `Destination : ${p.name} ! En route vers le pas de tir.`,
  countdownStart: 'Attention au décollage !',
  liftoff: 'Décollage !',
  space: () => pick(['Nous sommes dans l’espace !', 'Ça y est, nous sommes dans l’espace !']),
  approach: () => pick(['Une planète en vue !', 'Regarde, une planète !', 'Oh, une planète !']),
  approachBody: (p) => (p.kind === 'comet' ? 'Oh, regarde ! Qu’est-ce que c’est ?' : p.kind === 'moon' ? 'Regarde, une lune !' : null),

  // classic question
  question: (target) => `Est-ce que c’est ${target.name} ?`,
  goodNo: (p, t) => `${pick(['Bravo', 'Bien vu', 'Super'])} ! Ce n’est pas ${t.name}. C’est ${p.name} ! On continue le voyage.`,
  wrongYes: (p, t) => `Hmm, regarde bien… Ce n’est pas ${t.name}, c’est ${p.name} ! ${t.hint} On continue !`,
  goodYes: (t, name) => `${pick(['Bravo', 'Génial', 'Super'])}${name ? ' ' + name : ''} ! C’est bien ${t.name} !`,
  wrongNo: (t) => `Regarde bien… C’est bien ${t.name} ! ${t.hint}`,

  // feature question ("does it have rings?")
  featureIntro: 'Regarde bien.',
  featureGood: () => pick(['Bravo !', 'Oui, bien vu !', 'Super !']),
  featureWrong: 'Regarde bien…',
  featureReveal: (p, t) => (p.id === t.id
    ? `C’est ${p.name}, notre destination !`
    : `C’est ${p.name}. Ce n’est pas ${t.name}, on continue le voyage !`),

  arrive: (t) => `Nous arrivons en orbite autour de ${t.name} !`,
  victoryTitle: (name) => (name ? `Bravo ${name} !` : 'Bravo !'),
  victoryLine: (t) => `Tu as voyagé de la Terre jusqu’à ${t.name} !`,
  victorySpeech: (t, name) =>
    `Bravo${name ? ' ' + name : ''} ! Mission réussie ! Tu as voyagé de la Terre jusqu’à ${t.name}. ${t.fact}`,

  // encounters during the trip
  starsIntro: 'Des étoiles filantes ! Touche-les pour les attraper !',
  starsEnd: (n) => (n > 1 ? `Tu as attrapé ${NUMBERS[n] || n} étoiles !` : n === 1 ? 'Tu as attrapé une étoile !' : 'Elles étaient rapides ! On continue.'),
  comet: 'Oh ! Une comète ! Regarde sa longue queue qui brille.',
  station: 'Une station spatiale ! Des astronautes vivent dedans. Fais-leur coucou !',
  stationReply: 'Les astronautes te répondent : coucou, et bon voyage !',
  ship: 'Un vaisseau ami vient nous dire bonjour ! Touche-le !',
  shipTap: () => pick(['Il fait une pirouette !', 'Il est content !', 'Youpi !']),
  asteroids: 'Des astéroïdes ! Ce sont de gros cailloux qui flottent dans l’espace.',
  quizIntro: 'Petite devinette de l’ordinateur de bord !',
  quizGood: (p) => `Bravo ! C’est ${p.name} !`,
  quizWrong: (p) => `Non, ça, c’est ${p.name}. Essaie encore !`,

  // arrival activities
  roverIntro: 'Nous sommes sur Mars ! Aide le robot à ramasser les cailloux. Touche un caillou !',
  roverEnd: 'Bravo ! Le robot a ramassé tous les cailloux !',
  ringsIntro: 'Nous traversons les anneaux de Saturne ! Attrape les cristaux de glace !',
  ringsEnd: 'Bravo ! Tu as attrapé tous les cristaux de glace !',
  flagIntro: 'Nous sommes sur la Lune ! Touche le sol pour planter ton drapeau.',
  flagDone: 'Super ! Maintenant, touche l’astronaute pour le faire sauter !',
  jump: () => pick(['Hop !', 'Youpi !', 'Boing !']),
  flagEnd: 'Sur la Lune, on saute très haut, car on est tout léger !',
  spotIntro: (label) => `Peux-tu trouver ${label} ? Touche-la !`,
  spotHint: (label) => `Cherche bien… ${label} est là, quelque part.`,
  spotFound: (label) => `Bravo ! Tu as trouvé ${label} !`,
  factsIntro: 'Touche-la pour découvrir ses secrets !',
  photo: 'Prends une photo souvenir ! Touche l’appareil photo.',
  photoDone: 'Clic ! La photo est dans ton carnet.',

  // progression
  unlocked: 'Nouvelles destinations ! Tu peux maintenant aller sur la Lune, sur Europe, sur Titan, sur Pluton, et sur une comète !',
  newDecor: (names) => `${names.length > 1 ? 'Nouveaux décors' : 'Nouveau décor'} pour ta fusée : ${list(names)} ! Va voir dans « Ma fusée ».`,
  newDecorTitle: (n) => (n > 1 ? 'Nouveaux décors !' : 'Nouveau décor !'),
  unlockTitle: 'Nouvelles destinations !',

  // menus
  bonusTitle: 'Destinations bonus',
  lockedGrid: (n) => `Encore ${n} planète${n > 1 ? 's' : ''} à visiter pour des surprises !`,
  carnetSpeech: (n) => `Ton carnet de bord ! Tu as ${n} étoile${n > 1 ? 's' : ''}.`,
  garageSpeech: 'Décore ta fusée !',
  notYet: 'pas encore',
  lockedStamp: 'Visite les 7 planètes pour découvrir de nouvelles destinations !',
  noPhotos: 'Prends des photos souvenirs en arrivant sur les planètes !',
  decorLocked: (need, have) => `Il faut ${need} étoiles pour ce décor. Tu en as ${have}. Continue tes voyages !`,
  nameOnRocket: (name) => `${name} sur la fusée`,
  loadError: 'Oups, le chargement a échoué. Ferme et rouvre le jeu.',

  // reminders and counting during the activities
  roverIdle: 'Touche un caillou qui brille !',
  ringsIdle: 'Touche les cristaux qui brillent !',
  flagIdle: 'Touche le sol pour planter ton drapeau !',
  jumpIdle: 'Touche l’astronaute pour le faire sauter !',
  count: (n) => `${NUMBERS[n] || n} !`,
  wave: '👋 Coucou !',
};
