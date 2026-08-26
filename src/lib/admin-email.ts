export function isAdminEmail(email: string | undefined): boolean {
  const configured = import.meta.env.VITE_INITIAL_ADMIN_EMAIL || "rlpeixoto@gmail.com";
  return !!email && email.toLowerCase() === configured.toLowerCase();
}
