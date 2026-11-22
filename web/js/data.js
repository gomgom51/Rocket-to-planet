// Planet data and every sentence the game says or shows (French).

export const PLANETS = {
  mercury: {
    id: 'mercury', name: 'Mercure', tilt: 0.03, spin: 0.05,
    orbit: 1.75, mapSize: 0.26,
    hint: 'Mercure est toute petite et grise, avec plein de cratères.',
    fact: 'Mercure est la planète la plus proche du Soleil.',
  },
  venus: {
    id: 'venus', name: 'Vénus', tilt: 0.05, spin: 0.02,
    orbit: 2.4, mapSize: 0.38,
    atmosphere: { color: [1.0, 0.86, 0.6], halo: 0.9, haze: 0.5 },
    hint: 'Vénus est toute jaune, cachée sous ses nuages.',
    fact: 'Vénus est la planète la plus chaude. Il y fait encore plus chaud que dans un four !',
  },
  earth: {
    id: 'earth', name: 'la Terre', short: 'Terre', tilt: 0.41, spin: 0.08, face: 0.54,
    orbit: 3.1, mapSize: 0.40,
    atmosphere: { color: [0.35, 0.62, 1.0], halo: 1.2, haze: 0.8 },
  },
  mars: {
    id: 'mars', name: 'Mars', tilt: 0.44, spin: 0.08,
    orbit: 3.85, mapSize: 0.31,
    atmosphere: { color: [1.0, 0.62, 0.42], halo: 0.35, haze: 0.25 },
    hint: 'Mars est la planète rouge.',
    fact: 'Mars est rouge, car son sol est couvert de poussière couleur rouille.',
  },
  jupiter: {
    id: 'jupiter', name: 'Jupiter', tilt: 0.05, spin: 0.12, face: 0.375,
    orbit: 5.0, mapSize: 0.78,
    atmosphere: { color: [1.0, 0.9, 0.78], halo: 0.25, haze: 0.2 },
    hint: 'Jupiter est la plus grosse, avec des bandes et une grande tache rouge.',
    fact: 'Jupiter est la plus grosse planète. Toutes les autres planètes pourraient tenir dedans !',
  },
  saturn: {
    id: 'saturn', name: 'Saturne', tilt: 0.47, spin: 0.11,
    orbit: 6.2, mapSize: 0.66, rings: true,
    atmosphere: { color: [1.0, 0.92, 0.75], halo: 0.25, haze: 0.2 },
    hint: 'Saturne a de magnifiques anneaux.',
    fact: 'Les anneaux de Saturne sont faits de morceaux de glace et de cailloux.',
  },
  uranus: {
    id: 'uranus', name: 'Uranus', tilt: 1.7, spin: 0.07,
    orbit: 7.3, mapSize: 0.5,
    atmosphere: { color: [0.62, 0.92, 1.0], halo: 0.6, haze: 0.45 },
    hint: 'Uranus est toute bleu-vert, très pâle.',
    fact: 'Uranus tourne couchée sur le côté, comme une roue qui roule.',
  },
  neptune: {
    id: 'neptune', name: 'Neptune', tilt: 0.49, spin: 0.07, face: 0.54,
    orbit: 8.3, mapSize: 0.49,
    atmosphere: { color: [0.35, 0.55, 1.0], halo: 0.7, haze: 0.5 },
    hint: 'Neptune est d’un bleu très profond.',
    fact: 'Neptune est la planète la plus loin du Soleil. Il y souffle des vents très forts !',
  },
};

// Order from the Sun (used for the map) and the possible destinations.
// Body rotation that brings texture coordinate `u` (0..1) in front of a camera on +Z.
export const faceRotation = (def) => Math.PI / 2 - 2 * Math.PI * ((def && def.face) || 0.5);

export const ORDER =['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const DESTINATIONS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export const NUMBERS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const TEXT = {
  title: 'Voyage vers les planètes',
  choose: 'Où veux-tu aller ?',
  chosen: (p) => `${p.name} !`,
  go: (p) => `Destination : ${p.name} ! En route vers le pas de tir.`,
  countdownStart: 'Attention au décollage !',
  liftoff: 'Décollage !',
  space: () => pick(['Nous sommes dans l’espace !', 'Ça y est, nous sommes dans l’espace !']),
  approach: () => pick(['Une planète en vue !', 'Regarde, une planète !', 'Oh, une planète !']),
  question: (target) => `Est-ce que c’est ${target.name} ?`,
  // Answer feedback. p = planet shown, t = destination.
  goodNo: (p, t) => `${pick(['Bravo', 'Bien vu', 'Super'])} ! Ce n’est pas ${t.name}. C’est ${p.name} ! On continue le voyage.`,
  wrongYes: (p, t) => `Hmm, regarde bien… Ce n’est pas ${t.name}, c’est ${p.name} ! ${t.hint} On continue !`,
  goodYes: (t, name) => `${pick(['Bravo', 'Génial', 'Super'])}${name ? ' ' + name : ''} ! C’est bien ${t.name} !`,
  wrongNo: (t) => `Regarde bien… C’est bien ${t.name} ! ${t.hint}`,
  arrive: (t) => `Nous arrivons en orbite autour de ${t.name} !`,
  victoryTitle: (name) => (name ? `Bravo ${name} !` : 'Bravo !'),
  victoryLine: (t) => `Tu as voyagé de la Terre jusqu’à ${t.name} !`,
  victorySpeech: (t, name) =>
    `Bravo${name ? ' ' + name : ''} ! Mission réussie ! Tu as voyagé de la Terre jusqu’à ${t.name}. ${t.fact}`,
};
