import { redirect } from 'next/navigation';

/**
 * /dashboard → / redirect.
 *
 * The root path "/" is the main control panel (labeled "Dashboard"
 * in the sidebar). This page ensures /dashboard never returns 404.
 */
export default function DashboardRedirect() {
  redirect('/');
}
