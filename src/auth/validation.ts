export type RegistrationInput = {
  username: string
  name: string
  email: string
  password: string
  bio: string
}

export type RegistrationErrors = Partial<Record<keyof RegistrationInput | 'confirmation', string>>

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string) {
  return /^[a-z0-9][a-z0-9_.-]{2,31}$/.test(value)
}

export function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateRegistration(input: RegistrationInput, confirmation: string): RegistrationErrors {
  const errors: RegistrationErrors = {}
  if (!isValidUsername(normalizeUsername(input.username))) errors.username = 'Use de 3 a 32 caracteres: letras sem acento, números, ponto, hífen ou sublinhado. Comece com uma letra ou número.'
  if (!input.name.trim() || input.name.trim().length > 80) errors.name = 'Digite seu nome, com até 80 caracteres.'
  if (!isValidEmail(input.email.trim())) errors.email = 'Digite um e-mail válido.'
  if (input.password.length < 8 || input.password.length > 256) errors.password = 'Use uma senha de 8 a 256 caracteres.'
  if (!confirmation) errors.confirmation = 'Repita sua senha.'
  else if (confirmation !== input.password) errors.confirmation = 'As senhas precisam ser iguais.'
  if (input.bio.length > 300) errors.bio = 'Sua biografia deve ter até 300 caracteres.'
  return errors
}
