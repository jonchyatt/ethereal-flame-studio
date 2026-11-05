export const SITE_NAME = 'What Am I Appreciating Now';
export const CHANNEL = 'https://www.youtube.com/@What_Am_I_Appreciating_Now';

export const clips = [
  {
    id: '19',
    title: 'Put one hand on your chest',
    duration: '0:41',
    seconds: 41.333333,
    topic: 'A moment of appreciation',
    description:
      'Rest one hand on your chest and notice what has carried you through today.',
    transcript:
      'Put one hand on your chest.\nRight now.\n\nFeel that?\nSomething in you kept time all day,\nand you never once had to ask it to.\n\nIt seems like you’ve been carrying a lot.\n\nSo for the next ten seconds,\nlet your hand do the holding.\n\nNow… what am I appreciating?\n\nThat.',
  },
  {
    id: '12',
    title: 'Let that thank-you land again',
    duration: '0:59',
    seconds: 59.266667,
    topic: 'A moment of gratitude',
    description:
      'Remember a time someone thanked you and meant it. Give yourself a moment to receive it again.',
    transcript:
      'Think of a time someone thanked you,\nand meant it.\n\nNot a polite thanks.\nThe kind where they looked right at you.\n\nWhere were you standing?\nWhat did their face do?\n\nLet it land again,\nthe way it landed then.\n\nIt seems like you’re quicker to give thanks than to take it.\n\nSo take this one.\nBreathe it in.\n\nYou did something\nthat mattered to someone.\nIt still does.\n\nNow… what am I appreciating?\n\nBeing someone worth thanking.',
  },
  {
    id: '04',
    title: 'Take one long breath out with me',
    duration: '1:06',
    seconds: 65.533333,
    topic: 'A breathing invitation',
    description:
      'Pause at your own pace. If anything feels uncomfortable, breathe normally.',
    transcript:
      'Before you scroll.\nOne breath with me.\n\nIn through the nose…\nand a little more on top.\n\nNow let it all go,\nslowly,\nlonger than you think you need.\n\nAgain.\nIn…\nand a sip more…\nand out,\nall the way down.\n\nIt sounds like the day got loud.\n\nYour breath is the one volume knob you always carry.\n\nOne more,\nat your own pace.\n\nIf anything feels uncomfortable,\njust breathe normally.\n\nWhat’s a little quieter now?\n\nNow, what am I appreciating?\nThis breath.',
  },
] as const;
export type Clip = (typeof clips)[number];
export const VOICE_CREDIT =
  'Voice: Jonathan Hyatt, generated from his own recordings with an AI voice clone.';
export const MUSIC_CREDIT =
  'Calm Pill 1 — Still Habitat, curated and mixed by Alaeddin Hallak. Source: CalmPills on Internet Archive; item labelled CC0.';

export const concepts = [
  {
    slug: 'fractal-vortex-tee',
    title: 'Fractal-Vortex Continual Loop Tee',
    image: 'image1.jpg',
    short: 'Fractal-Vortex Tee',
    description:
      'Emerald, magenta and fiery orange within a continuous gold ring. A black tee concept.',
    note: 'Lettering, separator dots and NOW placement need correction against the carving before a print proof. Fabric, fit and inks are not yet verified.',
  },
  {
    slug: 'infinity-ribbon-tee',
    title: 'Infinity-Ribbon and Flame Orb Pivot Tee',
    image: 'image3.jpg',
    short: 'Infinity-Ribbon Tee',
    description:
      'A ribbon of light returns to NOW at the flame-orb crossover. A midnight-navy tee concept.',
    note: 'The repeated generated lettering needs correction. The lower lettering must invert along each lobe; the printed glow must blend into the fabric.',
  },
  {
    slug: 'carved-wood-mug',
    title: 'Carved-Wood Optical Vortex Continual Loop Mug',
    image: 'image2.jpg',
    short: 'Carved-Wood Vortex Mug',
    description:
      'The depth of carved wood imagined on a black mug with a gold interior.',
    note: 'Carving fidelity, lettering, ceramic finish and printable area still need a physical proof. The proposed size is 15 oz.',
  },
  {
    slug: 'horizon-orb-mug',
    title: '360 VR Horizon and Luminous Orb Continual Loop Mug',
    image: 'image4.jpg',
    short: 'Horizon and Orb Mug',
    description:
      'Purple sky, luminous gold and a reflection on dark water. A navy wraparound mug concept.',
    note: 'Lettering, wrap seam and handle clearance need a print master. The proposed 11 or 15 oz size is not yet decided.',
  },
] as const;

export const videos360 = [
  { id: 'LAIVtQpHYHc', title: 'Rampage of Appreciation', duration: '4:11' },
  {
    id: 'ktfbG2iprd8',
    title: 'Rampage of Appreciation — Blue & Gold Sky',
    duration: '3:28',
  },
  {
    id: 'GZwGVcAxXK4',
    title: 'Appreciation Is My Final Key — Starfield',
    duration: '10:27',
  },
  { id: 'kBcSjgD-MAQ', title: 'Nothing Is More Important', duration: '4:29' },
] as const;
