/**
 * PUBLIC_ROUTES — pages that must always render without auth.
 *
 * These routes are excluded from auth guards, sidebar, and Topbar.
 * They work regardless of SAAS_MODE, login state, or localStorage.
 */

export const PUBLIC_ROUTES = [
  '/register',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
  '/cookies',
  '/faq',
  '/contact',
  '/pricing',
  '/support',
  '/developers',
  '/onboarding',
];

/** Returns true when the given pathname is a public (unauth) page. */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '?'));
}
