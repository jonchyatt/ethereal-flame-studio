/**
 * 360 VR sessions shown on /vr. Empty until Jonathan picks them: every entry must be
 * our own or cleared footage (no third-party channels).
 */
export interface VrSession {
  title: string;
  /** YouTube link to the 360 video. */
  youtube: string;
  /** Length as shown, e.g. "12 min". */
  length: string;
  /** "Goes with": the program this session pairs with. */
  goesWith: { label: string; href: string };
}

export const VR_SESSIONS: readonly VrSession[] = [
  // {
  //   title: 'A quiet forest at first light',
  //   youtube: 'https://www.youtube.com/watch?v=VIDEO_ID',
  //   length: '12 min',
  //   goesWith: { label: 'Advanced hypnosis sessions', href: '/programs/advanced-hypnosis-sessions' },
  // },
];

/** /vr is a hidden draft: it answers 404 unless WAIA_VR_PUBLIC=1. */
export const vrPublic = () => process.env.WAIA_VR_PUBLIC === '1';
