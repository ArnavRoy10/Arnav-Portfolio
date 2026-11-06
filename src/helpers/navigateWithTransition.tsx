/**
 * Asks SiteShell to play the page-curtain transition and then navigate.
 * SiteShell listens for the "site:page-transition" event on window.
 */
export function navigateWithTransition(to: string, label?: string) {
  window.dispatchEvent(
    new CustomEvent("site:page-transition", { detail: { to, label } }),
  );
}
