type Draftable = { draft: boolean };

export const draftPreviewEnabled = import.meta.env.DEV && process.env.SHOW_DRAFTS === 'true';

export function isVisibleContent(data: Draftable) {
  return draftPreviewEnabled || !data.draft;
}
