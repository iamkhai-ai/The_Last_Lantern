export interface CampaignStartData { newGame?: boolean }

/** Consume the one-shot New Game request from both Phaser's argument and retained settings data. */
export function consumeCampaignNewGameIntent(
  data: CampaignStartData | undefined,
  retainedData: CampaignStartData | undefined,
): boolean {
  const requested = data?.newGame === true || retainedData?.newGame === true;
  if (data) delete data.newGame;
  if (retainedData && retainedData !== data) delete retainedData.newGame;
  return requested;
}
