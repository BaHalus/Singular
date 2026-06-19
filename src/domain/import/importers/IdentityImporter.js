export function importIdentity(source = {}) {
  return {
    id: source.id ?? source.uuid ?? source.profile?.id ?? undefined,
    name: source.name ?? source.profile?.name ?? "Unnamed",
    concept: source.concept ?? source.profile?.concept ?? "",
    playerId: source.playerId ?? source.profile?.player ?? source.profile?.player_name ?? null,
    campaignId: source.campaignId ?? source.profile?.campaign ?? source.profile?.campaign_name ?? null,
  };
}
