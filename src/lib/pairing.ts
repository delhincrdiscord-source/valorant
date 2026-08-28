// Fallback team name from two Riot handles (name portion only), used when a
// duo registers without typing a team name.

const handle = (riotId: string) => riotId.split("#")[0] || riotId;

export function teamName(riotIdA: string, riotIdB: string): string {
  return `${handle(riotIdA)} + ${handle(riotIdB)}`;
}
