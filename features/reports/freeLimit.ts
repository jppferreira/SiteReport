export const FREE_REPORT_LIMIT = 3;

export const canGenerateReport = (hasProAccess: boolean, generatedReports: number) => {
  if (hasProAccess) {
    return true;
  }
  return generatedReports < FREE_REPORT_LIMIT;
};
