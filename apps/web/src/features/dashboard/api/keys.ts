export const dashboardKeys = {
  all: (officeId: string) => ['office', officeId, 'dashboard'] as const,
  deadlines: (officeId: string) => [...dashboardKeys.all(officeId), 'deadlines'] as const,
  recentCases: (officeId: string) => [...dashboardKeys.all(officeId), 'recent-cases'] as const,
  recentActivity: (officeId: string) => [...dashboardKeys.all(officeId), 'recent-activity'] as const,
  portfolioMetrics: (officeId: string) =>
    [...dashboardKeys.all(officeId), 'portfolio-metrics'] as const,
  notificationsPreview: (officeId: string) =>
    [...dashboardKeys.all(officeId), 'notifications-preview'] as const,
};
