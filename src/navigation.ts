export const ACTIVE_TABS = [
  'mindmap', 'diagnostics', 'midimapping', 'triggerusb', 'activitylogger',
  'multirecord', 'trxblueprint', 'code', 'export', 'presskit',
  'customdashboard', 'spatial3d', 'spatial5d', 'tripleaudit',
  'arrgenius', 'snapshotmorph', 'remoteportal', 'acousticlab',
] as const;

export type ActiveTab = (typeof ACTIVE_TABS)[number];

const ACTIVE_TAB_SET = new Set<string>(ACTIVE_TABS);

export function isActiveTab(value: unknown): value is ActiveTab {
  return typeof value === 'string' && ACTIVE_TAB_SET.has(value);
}
