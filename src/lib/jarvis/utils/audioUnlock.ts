/**
 * iOS Audio Unlock — singleton that must be called from a direct user gesture.
 * Call from JarvisShell (first touch anywhere) so spotlight narration works
 * even before the user ever opens the chat panel.
 */
let unlocked = false;

export function unlockIOSAudio(): void {
  if (unlocked) return;
  const unlock = new Audio();
  unlock.play().catch(() => {});
  unlocked = true;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}
