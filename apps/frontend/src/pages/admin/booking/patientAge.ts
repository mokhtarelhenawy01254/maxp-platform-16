export const computeAge = (birthDate: string): string => {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (now.getDate() < birth.getDate()) {
    months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
  }
  if (years < 0) return "";

  const formatYears = (n: number): string => {
    if (n === 0) return "";
    if (n === 1) return "سنة واحدة";
    if (n === 2) return "سنتان";
    if (n <= 10) return `${n} سنوات`;
    return `${n} سنة`;
  };
  const formatMonths = (n: number): string => {
    if (n === 0) return "";
    if (n === 1) return "شهر واحد";
    if (n === 2) return "شهران";
    if (n <= 10) return `${n} شهور`;
    return `${n} شهر`;
  };

  const yearsPart = formatYears(years);
  const monthsPart = formatMonths(months);
  if (!yearsPart) return monthsPart;
  if (!monthsPart) return yearsPart;
  return `${yearsPart} و${monthsPart}`;
};
