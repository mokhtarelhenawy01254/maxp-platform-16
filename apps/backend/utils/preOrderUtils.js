// ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪│╪¿┘é: ┘ç┘ä ┘è┘Å╪│┘à╪¡ ╪¿╪º┘ä╪╖┘ä╪¿ ╪¡╪¬┘ë ┘ä┘ê ╪º┘ä┘à╪«╪▓┘ê┘å ╪║┘è╪▒ ┘â╪º┘ü┘ì╪ƒ
// ╪º┘ä╪┤╪▒╪╖: ╪º┘ä┘à┘å╪¬╪¼ pre-order ┘ê╪¬╪º╪▒┘è╪« ╪º┘ä╪¬┘ê┘ü╪▒ ╪║┘è╪▒ ┘à╪¡╪»╪» ╪ú┘ê ┘ü┘è ╪º┘ä┘à╪│╪¬┘é╪¿┘ä.
const isPreOrderEligible = (product) => {
  if (!product || product.isPreOrder !== true) {
    return false;
  }

  if (!product.preOrderDate) {
    return true;
  }

  const parsedDate = new Date(product.preOrderDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return true;
  }

  return parsedDate.getTime() >= Date.now();
};

module.exports = {
  isPreOrderEligible,
};
