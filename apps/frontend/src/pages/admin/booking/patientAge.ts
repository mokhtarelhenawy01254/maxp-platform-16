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
    if (n === 1) return "╪│┘å╪⌐ ┘ê╪º╪¡╪»╪⌐";
    if (n === 2) return "╪│┘å╪¬╪º┘å";
    if (n <= 10) return `${n} ╪│┘å┘ê╪º╪¬`;
    return `${n} ╪│┘å╪⌐`;
  };
  const formatMonths = (n: number): string => {
    if (n === 0) return "";
    if (n === 1) return "╪┤┘ç╪▒ ┘ê╪º╪¡╪»";
    if (n === 2) return "╪┤┘ç╪▒╪º┘å";
    if (n <= 10) return `${n} ╪┤┘ç┘ê╪▒`;
    return `${n} ╪┤┘ç╪▒`;
  };

  const yearsPart = formatYears(years);
  const monthsPart = formatMonths(months);
  if (!yearsPart) return monthsPart;
  if (!monthsPart) return yearsPart;
  return `${yearsPart} ┘ê${monthsPart}`;
};
