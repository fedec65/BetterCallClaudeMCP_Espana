const ECLI_REGEX = /^ECLI:ES:([A-Z]+):(\d{4}):\d+$/;

export function isValidEcli(ecli: string): boolean {
  return ECLI_REGEX.test(ecli.toUpperCase());
}

export function parseEcli(ecli: string): { country: string; court: string; year: string; number: string } | null {
  const match = ecli.toUpperCase().match(ECLI_REGEX);
  if (!match) return null;
  return {
    country: 'ES',
    court: match[1],
    year: match[2],
    number: match[0].split(':').pop()!,
  };
}
