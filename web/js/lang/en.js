// English sentences. Same keys as the French texts in ../data.js: anything
// missing here falls back to French. They are read aloud by the phone's voice,
// so keep them short and simple.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
// "a, b and c"
const list = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);

export default {
  planets: {
    mercury: {
      name: 'Mercury',
      hint: 'Mercury is very small and gray, with lots of craters.',
      fact: 'Mercury is the planet closest to the Sun.',
      facts: [
        'Mercury goes around the Sun very fast: a year there lasts only 88 days.',
        'In the daytime, it is very hot on Mercury. At night, it is very, very cold.',
        'Mercury has no moon.',
      ],
    },
    venus: {
      name: 'Venus',
      hint: 'Venus is all yellow, hidden under its clouds.',
      fact: 'Venus is the hottest planet. It is even hotter than an oven!',
      facts: [
        'Venus spins backwards, the other way from Earth.',
        'On Venus, a day lasts longer than a year!',
        'Venus is the brightest planet in our sky, in the evening and in the morning.',
      ],
    },
    earth: {
      name: 'Earth', short: 'Earth',
      hint: 'Earth is blue and green, with white clouds.',
    },
    mars: {
      name: 'Mars',
      hint: 'Mars is the red planet.',
      fact: 'Mars is red because its ground is covered in rust-colored dust.',
    },
    jupiter: {
      name: 'Jupiter',
      hint: 'Jupiter is the biggest one, with stripes and a great red spot.',
      fact: 'Jupiter is the biggest planet. All the other planets could fit inside it!',
      label: 'the great red spot',
    },
    saturn: {
      name: 'Saturn',
      hint: 'Saturn has beautiful rings.',
      fact: 'Saturn’s rings are made of pieces of ice and rock.',
    },
    uranus: {
      name: 'Uranus',
      hint: 'Uranus is all blue-green and very pale.',
      fact: 'Uranus spins lying on its side, like a rolling wheel.',
      facts: [
        'Uranus has twenty-eight moons.',
        'Uranus is very cold: it is an ice giant.',
        'Uranus has rings too, but they are very thin.',
      ],
    },
    neptune: {
      name: 'Neptune',
      hint: 'Neptune is a very deep blue.',
      fact: 'Neptune is the planet farthest from the Sun. Very strong winds blow there!',
      label: 'the dark spot',
    },
    moon: {
      name: 'the Moon', short: 'Moon',
      hint: 'The Moon is gray, with big dark patches and lots of craters.',
      fact: 'The Moon goes around Earth. Astronauts have walked on it!',
    },
    europa: {
      name: 'Europa',
      hint: 'Europa is an icy moon, very light with brown lines.',
      fact: 'Europa is a moon of Jupiter. Under its ice, there may be a big ocean!',
      facts: [
        'Europa is a little smaller than our Moon.',
        'Its ice is all cracked, like an eggshell.',
        'Under Europa’s ice, there is probably an ocean of salty water.',
      ],
    },
    titan: {
      name: 'Titan',
      hint: 'Titan is an all-orange moon, hidden in fog.',
      fact: 'Titan is Saturn’s biggest moon. It has lakes and rivers!',
      facts: [
        'Titan is bigger than the planet Mercury!',
        'On Titan, it rains, but not water: it rains methane.',
        'A little probe called Huygens landed on Titan.',
      ],
    },
    pluto: {
      name: 'Pluto',
      hint: 'Pluto is small, with a big light-colored heart.',
      fact: 'Pluto is a dwarf planet, very far away and very cold. It has a big heart made of ice!',
      label: 'the big heart',
    },
    comet: {
      name: 'the comet', short: 'Comet',
      hint: 'The comet has a long, shining tail.',
      fact: 'A comet is a big ball of ice and dust. Near the Sun, it grows a long tail!',
      facts: [
        'A comet’s tail always points away from the Sun.',
        'A comet’s tail can be millions of kilometers long!',
        'Halley’s Comet comes back near Earth every seventy-six years.',
      ],
    },
  },

  numbers: NUMBERS,

  // yes/no questions in front of a planet
  features: {
    rings: { q: 'Does it have big rings?', isYes: 'It has big rings.', isNo: 'It doesn’t have big rings.' },
    red: { q: 'Is it red?', isYes: 'It is all red.', isNo: 'It isn’t red.' },
    biggest: { q: 'Is it the biggest planet?', isYes: 'It’s the biggest of all!', isNo: 'It isn’t the biggest.' },
    deepblue: { q: 'Is it dark blue?', isYes: 'It is dark blue.', isNo: 'It isn’t dark blue.' },
    yellow: { q: 'Is it all yellow?', isYes: 'It is all yellow.', isNo: 'It isn’t all yellow.' },
    craters: { q: 'Is it gray, with craters?', isYes: 'It is gray, with lots of craters.', isNo: 'It isn’t gray.' },
    stripes: { q: 'Does it have stripes?', isYes: 'It has beautiful stripes.', isNo: 'It doesn’t have stripes.' },
    paleblue: { q: 'Is it pale blue-green?', isYes: 'It is pale blue-green.', isNo: 'It isn’t blue-green.' },
    orange: { q: 'Is it all orange?', isYes: 'It is all orange.', isNo: 'It isn’t orange.' },
    heart: { q: 'Does it have a big light heart?', isYes: 'It has a big light heart.', isNo: 'It doesn’t have a heart.' },
    tail: { q: 'Does it have a long tail?', isYes: 'It has a long tail.', isNo: 'It doesn’t have a tail.' },
  },

  // picture quizzes from the onboard computer
  quizzes: {
    rings: 'Which one has big rings?',
    red: 'Find the red planet!',
    biggest: 'Which one is the biggest?',
    smallest: 'Which one is the smallest?',
    earth: 'Find Earth, our home!',
    yellow: 'Which one is hidden under yellow clouds?',
    deepblue: 'Which one is dark blue?',
    target: (t) => `Find ${t.name}!`,
  },

  colors: {
    white: 'White', silver: 'Silver', red: 'Red', orange: 'Orange', yellow: 'Yellow',
    green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink', black: 'Black',
  },

  decors: {
    classic: 'Classic', none: 'Plain', stars: 'Stars', hearts: 'Hearts',
    dots: 'Dots', planets: 'Planets', rainbow: 'Rainbow', flames: 'Flames',
  },

  text: {
    title: 'Journey to the Planets',
    choose: 'Where shall we go?',
    chosen: (p) => `${cap(p.name)}!`,
    go: (p) => `Destination: ${p.name}! Off to the launch pad.`,
    countdownStart: 'Get ready for liftoff!',
    liftoff: 'Liftoff!',
    space: () => pick(['We are in space!', 'Here we are, in space!']),
    approach: () => pick(['A planet ahead!', 'Look, a planet!', 'Oh, a planet!']),
    approachBody: (p) => (p.kind === 'comet' ? 'Oh, look! What is that?' : p.kind === 'moon' ? 'Look, a moon!' : null),

    // classic question
    question: (target) => `Is it ${target.name}?`,
    goodNo: (p, t) => `${pick(['Well done', 'Good eye', 'Great'])}! It’s not ${t.name}. It’s ${p.name}! Let’s keep going.`,
    wrongYes: (p, t) => `Hmm, look carefully… It’s not ${t.name}, it’s ${p.name}! ${t.hint} Let’s keep going!`,
    goodYes: (t, name) => `${pick(['Well done', 'Awesome', 'Great'])}${name ? ', ' + name : ''}! Yes, it’s ${t.name}!`,
    wrongNo: (t) => `Look carefully… It really is ${t.name}! ${t.hint}`,

    // feature question ("does it have rings?")
    featureIntro: 'Look carefully.',
    featureGood: () => pick(['Well done!', 'Yes, good eye!', 'Great!']),
    featureWrong: 'Look carefully…',
    featureReveal: (p, t) => (p.id === t.id
      ? `It’s ${p.name}, our destination!`
      : `It’s ${p.name}. It’s not ${t.name}, let’s keep going!`),

    arrive: (t) => `We are arriving in orbit around ${t.name}!`,
    victoryTitle: (name) => (name ? `Well done, ${name}!` : 'Well done!'),
    victoryLine: (t) => `You traveled from Earth all the way to ${t.name}!`,
    victorySpeech: (t, name) =>
      `Well done${name ? ', ' + name : ''}! Mission accomplished! You traveled from Earth all the way to ${t.name}. ${t.fact}`,

    // encounters during the trip
    starsIntro: 'Shooting stars! Tap them to catch them!',
    starsEnd: (n) => (n > 1 ? `You caught ${NUMBERS[n] || n} stars!` : n === 1 ? 'You caught a star!' : 'They were fast! Let’s keep going.'),
    comet: 'Oh! A comet! Look at its long shining tail.',
    station: 'A space station! Astronauts live inside. Wave hello to them!',
    stationReply: 'The astronauts wave back: hello, and have a good trip!',
    ship: 'A friendly spaceship is coming to say hello! Tap it!',
    shipTap: () => pick(['It does a twirl!', 'It’s happy!', 'Yippee!']),
    asteroids: 'Asteroids! They are big rocks floating in space.',
    quizIntro: 'A little riddle from the onboard computer!',
    quizGood: (p) => `Well done! It’s ${p.name}!`,
    quizWrong: (p) => `No, that one is ${p.name}. Try again!`,

    // arrival activities
    roverIntro: 'We are on Mars! Help the robot pick up the rocks. Tap a rock!',
    roverEnd: 'Well done! The robot picked up all the rocks!',
    ringsIntro: 'We are flying through Saturn’s rings! Catch the ice crystals!',
    ringsEnd: 'Well done! You caught all the ice crystals!',
    flagIntro: 'We are on the Moon! Tap the ground to plant your flag.',
    flagDone: 'Great! Now tap the astronaut to make them jump!',
    jump: () => pick(['Hop!', 'Yippee!', 'Boing!']),
    flagEnd: 'On the Moon, you can jump very high, because you are so light!',
    spotIntro: (label) => `Can you find ${label}? Tap it!`,
    spotHint: (label) => `Look carefully… ${cap(label)} is somewhere here.`,
    spotFound: (label) => `Well done! You found ${label}!`,
    factsIntro: 'Tap it to discover its secrets!',
    photo: 'Take a souvenir photo! Tap the camera.',
    photoDone: 'Click! The photo is in your logbook.',

    // progression
    unlocked: 'New destinations! Now you can go to the Moon, to Europa, to Titan, to Pluto, and to a comet!',
    newDecor: (names) => `${names.length > 1 ? 'New patterns' : 'New pattern'} for your rocket: ${list(names)}! Go and look in “My rocket”.`,
    newDecorTitle: (n) => (n > 1 ? 'New patterns!' : 'New pattern!'),
    unlockTitle: 'New destinations!',

    // menus
    bonusTitle: 'Bonus destinations',
    lockedGrid: (n) => `${n} more planet${n > 1 ? 's' : ''} to visit for surprises!`,
    carnetSpeech: (n) => `Your logbook! You have ${n} star${n === 1 ? '' : 's'}.`,
    garageSpeech: 'Decorate your rocket!',
    notYet: 'not yet',
    lockedStamp: 'Visit the 7 planets to discover new destinations!',
    noPhotos: 'Take souvenir photos when you arrive on the planets!',
    decorLocked: (need, have) => `You need ${need} stars for this pattern. You have ${have}. Keep traveling!`,
    nameOnRocket: (name) => `${name} on the rocket`,
    loadError: 'Oops, loading failed. Close and reopen the game.',

    // reminders and counting during the activities
    roverIdle: 'Tap a shiny rock!',
    ringsIdle: 'Tap the shiny crystals!',
    flagIdle: 'Tap the ground to plant your flag!',
    jumpIdle: 'Tap the astronaut to make them jump!',
    count: (n) => `${NUMBERS[n] || n}!`,
    wave: '👋 Hello!',
  },

  // Texts written in index.html (elements with data-i18n attributes).
  ui: {
    title: 'Journey to the Planets',
    homeTitle: 'Journey<br>to the planets',
    play: 'Play',
    myRocket: 'My rocket',
    myCarnet: 'My logbook',
    myCarnetTitle: 'My logbook',
    settings: 'Settings',
    back: 'Back',
    home: 'Home',
    takePhoto: 'Take a photo',
    repeat: 'Repeat',
    choose: 'Where shall we go?',
    go: 'Let’s go!',
    yes: 'Yes',
    no: 'No',
    again: 'Replay',
    stamps: 'My stamps',
    photos: 'My photos',
    color: 'Color',
    fins: 'Fins',
    decor: 'Pattern',
    great: 'Great!',
    settingsTitle: 'Settings (parents)',
    childName: 'Child’s first name',
    optional: '(optional)',
    voice: 'A voice reads the texts aloud',
    sounds: 'Sounds',
    music: 'Music',
    volume: 'Volume',
    countdown: 'Countdown',
    stops: 'Planets to pass before the right one',
    random: 'Random',
    hint: 'Help: show the picture of the planet to find',
    credits: 'Credits',
    credits1: 'Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0 license, based on NASA data. Earth: NASA Earth Observatory, Blue Marble Next Generation (public domain). Moon: NASA Scientific Visualization Studio. Europa: USGS Astrogeology / NASA/JPL (public domain). Titan: NASA/JPL-Caltech/Space Science Institute. Pluto: NASA/JHUAPL/SwRI. Venus, Saturn’s rings, comet, Milky Way: generated by the game.',
    credits2: 'Music made with Suno. Liftoff sound: “Seamless rocket booster roar &amp; crackle”, freesound_community (Pixabay).',
    credits3: '3D engine: three.js (MIT license). Font: Nunito (SIL Open Font License).',
    confirm: 'Go back to the home screen?',
  },
};
