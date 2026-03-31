import { Clip } from '../store/useStore';

/**
 * Calculates a Ripple Edit and returns updated clips for a specific track.
 * 
 * A ripple edit changes the duration of a clip and shifts all subsequent clips 
 * remaining on the track forward or backward by the same amount (`delta`).
 * 
 * @param clips All clips on the track where the edit occurs
 * @param targetClipId The clip being trimmed
 * @param delta The change in duration (positive = longer/shifts later clips right; negative = shorter/shifts later clips left)
 * @param editSide 'in' or 'out' to determine which side of the clip is trimmed
 * @returns Array of updated clips
 */
export function calculateRippleEdit(
  clips: Clip[], 
  targetClipId: string, 
  delta: number, 
  editSide: 'in' | 'out'
): Clip[] {
  // Find the exact index and clone array
  const targetIndex = clips.findIndex(c => c.id === targetClipId);
  if (targetIndex === -1) return clips;

  const newClips = clips.map(c => ({ ...c }));
  const targetClip = newClips[targetIndex];

  // Adjust target clip's trimming 
  if (editSide === 'out') {
    // Trimming the out point
    targetClip.trimOut += delta;
    
    // Ensure we don't trim past the in point
    if (targetClip.trimOut <= targetClip.trimIn) {
      targetClip.trimOut = targetClip.trimIn + 0.1; // minimum length
    }
  } else {
    // Trimming the in point
    targetClip.trimIn += delta;
    
    // Adjust trackStart because trimming the "in" point changes where the visual block actually begins on the timeline
    // Wait... a standard ripple edit on IN point shifts the clip start BUT also shifts everything before it? 
    // Or shifts everything after it? Let's clarify standard NLE behavior:
    // If I ripple-in the START of a clip by +1s (making it shorter):
    // Standard Premiere behavior: The clip starts 1s later in its own media, but it shifts LEFT on the timeline to close the gap, 
    // AND all clips following it also shift left. The *start time* of the clip on the timeline doesn't actually change, but its duration shrinks, so following clips pull in.
    // Wait, let's implement standard Ripple Out first.
    
    if (targetClip.trimIn >= targetClip.trimOut) {
      targetClip.trimIn = targetClip.trimOut - 0.1;
    }
    // TODO: proper in-point ripple math
  }

  // Calculate actual change in duration (in case we hit minimum limits)
  const actualDelta = (editSide === 'out') 
    ? targetClip.trimOut - clips[targetIndex].trimOut
    : clips[targetIndex].trimIn - targetClip.trimIn; // if trimIn increases, clip gets shorter, delta is negative

  // Shift all clips that are chronologically AFTER this clip
  for (let i = 0; i < newClips.length; i++) {
    if (i !== targetIndex && newClips[i].trackStart >= clips[targetIndex].trackStart) {
      newClips[i].trackStart += actualDelta;
    }
  }

  return newClips;
}

/**
 * Calculates a Rolling Edit and returns updated clips for a specific track.
 * 
 * A rolling edit changes the out point of a clip and simultaneously changes 
 * the in point of the immediately adjacent following clip by the exact same amount.
 * The overall duration of the two clips remains constant, and no subsequent clips are shifted.
 * 
 * @param clips All clips on the track
 * @param leftClipId The clip whose out point is being modified
 * @param rightClipId The clip whose in point is being modified
 * @param delta The change in duration (positive = left clip gets longer, right clip gets shorter)
 * @returns Array of updated clips
 */
export function calculateRollingEdit(
  clips: Clip[],
  leftClipId: string,
  rightClipId: string,
  delta: number
): Clip[] {
  // Find indices
  const leftIdx = clips.findIndex(c => c.id === leftClipId);
  const rightIdx = clips.findIndex(c => c.id === rightClipId);

  if (leftIdx === -1 || rightIdx === -1) return clips;

  const newClips = clips.map(c => ({ ...c }));
  const leftClip = newClips[leftIdx];
  const rightClip = newClips[rightIdx];

  // Adjust left clip out-point
  leftClip.trimOut += delta;
  
  // Adjust right clip in-point and track start
  rightClip.trimIn += delta;
  rightClip.trackStart += delta; // It starts later on the track because the left clip is occupying the space

  // Safety bounds
  if (leftClip.trimOut <= leftClip.trimIn) {
    // left clip too small, rollback
    return clips;
  }
  if (rightClip.trimIn >= rightClip.trimOut) {
    // right clip too small, rollback
    return clips;
  }

  return newClips;
}