# Musiques du jeu avec Suno

Trois morceaux **instrumentaux** (la voix du jeu parle par-dessus) :
accueil, voyage, victoire. Rien pendant le décollage.

Dans Suno : mode **Custom**, interrupteur **Instrumental** activé, puis copier
le *Style* et la *Structure* (champ « Lyrics »). Si votre version de Suno a
le champ **Exclude styles**, y mettre la ligne « Exclure ».

Conseils :
- Générer 2 ou 3 versions de chaque et garder la plus **douce**
  (pas de percussion soudaine, pas d'aigus agressifs).
- Les écouter avec votre fille et la laisser choisir.
- Télécharger en **MP3** et renommer exactement `accueil.mp3`, `voyage.mp3`,
  `victoire.mp3`, puis les déposer dans `web/musique/`.

## 1. Accueil (`accueil.mp3`, en boucle)

**Style**
```
gentle magical orchestral theme for a children's space adventure game, instrumental, celesta and glockenspiel melody, soft harp arpeggios, warm string pad, light flute, sense of wonder and curiosity, dreamy, major key, 85 BPM, soft dynamics, no drums, smooth and inviting, loopable
```
**Exclure**
```
vocals, choir, drums, cymbals, electric guitar, distortion, sudden loud hits
```
**Structure (champ Lyrics)**
```
[Instrumental]
[Intro]
[Main Theme]
[Variation]
[Main Theme]
[Outro]
```

## 2. Voyage (`voyage.mp3`, en boucle)

**Style**
```
calm cosmic ambient music for floating through space, instrumental, slow evolving warm synth pads, soft felt piano notes, gentle shimmering arpeggios, subtle soft pulse giving a sense of movement, awe and wonder, peaceful and steady, 70 BPM, no drums, no big build-ups, constant soft volume, background music under narration, loopable
```
**Exclure**
```
vocals, choir, drums, cymbals, bass drop, dark, scary, dissonant, loud
```
**Structure (champ Lyrics)**
```
[Instrumental]
[Intro]
[Floating]
[Gentle Movement]
[Floating]
[Outro]
```

## 3. Victoire (`victoire.mp3`, jouée une fois)

**Style**
```
short joyful orchestral victory fanfare for a children's game, instrumental, warm french horns and trumpets, bright strings, glockenspiel sparkles, soft timpani roll, triumphant but gentle, major key, 110 BPM, celebratory and happy, clear ending on a final chord
```
**Exclure**
```
vocals, choir, cymbal crashes, drum kit, electric guitar, harsh, very loud
```
**Structure (champ Lyrics)**
```
[Instrumental]
[Fanfare]
[Celebration]
[Final Chord]
[End]
```
Le morceau idéal dure 20 à 45 secondes : s'il est plus long, le couper dans
l'éditeur de Suno (ou le laisser, le jeu le joue une seule fois).

## Son du décollage (`web/sons/decollage.mp3`)

Un vrai enregistrement est plus réaliste que Suno pour un bruit de moteur :
- [Pixabay – effets sonores « rocket launch »](https://pixabay.com/sound-effects/search/rocket%20launch/) (libres, sans attribution)
- [Freesound](https://freesound.org/search/?q=rocket+launch) (filtrer sur la licence CC0)
- les enregistrements audio de la NASA (domaine public)

Choisir 12 à 20 secondes qui **commencent à l'allumage du moteur**, sans
compte à rebours parlé, et le renommer `decollage.mp3`.
