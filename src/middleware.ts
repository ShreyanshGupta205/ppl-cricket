export { default } from 'next-auth/middleware';

export const config = {
  // Protect /admin/* BUT exclude /admin/login from the matcher
  // Otherwise NextAuth redirects /admin/login → /admin/login → infinite loop
  matcher: ['/admin/((?!login).*)'],
};