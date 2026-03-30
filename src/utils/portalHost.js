export const getReportsPortalHosts = () => {
  const configured = process.env.REACT_APP_REPORTS_PORTAL_HOSTS || '';
  return configured
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
};

export const isReportsPortalHost = (hostname = window.location.hostname) => {
  const normalizedHost = (hostname || '').toLowerCase();
  const configuredHosts = getReportsPortalHosts();

  if (configuredHosts.includes(normalizedHost)) {
    return true;
  }

  return normalizedHost.startsWith('reports.') || normalizedHost.startsWith('service-reports.');
};
