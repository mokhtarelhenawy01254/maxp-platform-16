/**
 * Utility to convert numbers to Arabic words (Tafqeet)
 * Simplified version for EGP
 */
export function numberToArabicWords(number: number): string {
  if (number === 0) return "صفر";

  const units = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
    "عشرة",
  ];
  const teens = [
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];
  const tens = [
    "",
    "",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
  const hundreds = [
    "",
    "مائة",
    "مائتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ];
  const thousands = [
    "",
    "ألف",
    "ألفان",
    "ثلاثة آلاف",
    "أربعة آلاف",
    "خمسة آلاف",
    "ستة آلاف",
    "سبعة آلاف",
    "ثمانية آلاف",
    "تسعة آلاف",
    "عشرة آلاف",
  ];

  const convert = (n: number): string => {
    if (n < 11) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " و " + units[n % 10] : "")
      );
    if (n < 1000)
      return (
        hundreds[Math.floor(n / 100)] +
        (n % 100 !== 0 ? " و " + convert(n % 100) : "")
      );
    if (n < 1000000)
      return (
        convert(Math.floor(n / 1000)) +
        " ألف " +
        (n % 1000 !== 0 ? " و " + convert(n % 1000) : "")
      );
    return n.toString(); // Fallback for very large numbers
  };

  const integerPart = Math.floor(number);
  const decimalPart = Math.round((number - integerPart) * 100);

  let result = convert(integerPart) + " جنيه مصري";
  if (decimalPart > 0) {
    result += " و " + convert(decimalPart) + " قرشاً";
  }

  return "فقط وقدره " + result + " لا غير";
}
