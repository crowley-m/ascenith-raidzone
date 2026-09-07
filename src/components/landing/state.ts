/** Shared mutable state the scroll layer writes and the 3D scene reads each frame. */
export const rzState = {
  hero: 0, // 0..1 progress of the hero pin (fly-into-crystal)
  page: 0, // 0..1 progress of the whole document
  scrollVel: 0, // recent scroll velocity, normalised-ish
  mx: 0, // pointer x, -1..1
  my: 0, // pointer y, -1..1
  down: 0, // click impulse, decays
  ready: false,
};
