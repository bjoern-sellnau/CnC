/** Global, menu-configurable options shared by the menu and the game. */
export type ViewMode = "topdown" | "iso";

export const settings = {
  /** CRT scanline/vignette overlay. */
  crt: true,
  /** World view projection (isometric mode is a work in progress). */
  view: "topdown" as ViewMode,
};
