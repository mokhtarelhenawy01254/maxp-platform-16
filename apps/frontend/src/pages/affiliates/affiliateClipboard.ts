import { copyToClipboard } from "../../utils/clipboard";

export const copyAffiliateText = async (text: string): Promise<boolean> => {
  return copyToClipboard(text);
};
