"use client";

/**
 * Release everything a LiveKit voice session holds on the browser side:
 * local mic tracks, the room connection, and the <audio> elements that
 * track.attach() created (they are appended to document.body, so they would
 * otherwise outlive the page). `audioEls` is emptied in place.
 */
export function teardownRoom(room, audioEls) {
  try {
    room?.localParticipant?.audioTrackPublications?.forEach((pub) => pub.track?.stop());
  } catch {
    // best effort — the room may already be torn down
  }
  try {
    room?.disconnect();
  } catch {
    // ignore
  }
  if (audioEls) {
    audioEls.forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
        el.remove();
      } catch {
        // ignore
      }
    });
    audioEls.length = 0;
  }
}
