// New invites use six digits. Existing 32-character codes remain valid so
// previously shared links keep working after the short-code migration.
export function normalizeInviteCode(value: string): string {
  const code = value.trim().toLowerCase()
  if (/^[0-9]{6}$/.test(code) || /^[a-f0-9]{32}$/.test(code)) return code
  throw new Error('Digite os 6 dígitos do convite enviado pelo mestre.')
}
