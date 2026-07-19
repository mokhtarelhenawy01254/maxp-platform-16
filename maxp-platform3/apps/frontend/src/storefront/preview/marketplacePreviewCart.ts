import { buildCartItemId, type CartItem } from "../store/useCartStore";
import {
  getMarketplacePreviewProduct,
  getMarketplacePreviewProducts,
  resolveMarketplacePreviewThemeId,
} from "./marketplaceSampleData";
import { ELESSI_PACK_CART_SEEDS } from "./elessiPackMarketplaceData";

type PreviewCartSeed = {
  productIdOrSlug: string;
  quantity: number;
  variantId?: string;
  attributes?: Record<string, string>;
};

const previewCartSeedsByTheme: Record<string, PreviewCartSeed[]> = {
  "fitting-room-studio": [
    {
      productIdOrSlug: "fr-fitting-dress",
      quantity: 1,
      variantId: "fr-fitting-dress-sky-size-L",
      attributes: {
        Color: "Powder Blue",
        Size: "L",
      },
    },
    {
      productIdOrSlug: "fr-cotton-t-shirt",
      quantity: 1,
      variantId: "fr-cotton-t-shirt-cream-size-M",
      attributes: {
        Color: "Cream",
        Size: "M",
      },
    },
    {
      productIdOrSlug: "fr-jean-jacket",
      quantity: 1,
      variantId: "fr-jean-jacket-light-blue-size-S",
      attributes: {
        Color: "Light Blue",
        Size: "S",
      },
    },
  ],
  "cafe-demo": [
    {
      productIdOrSlug: "house-blend-beans",
      quantity: 1,
      attributes: {
        "الطحن": "إسبريسو",
        "الوزن": "250 جم",
      },
    },
    {
      productIdOrSlug: "pistachio-croissant",
      quantity: 2,
      attributes: {
        "التقديم": "جاهز مع القهوة",
      },
    },
    {
      productIdOrSlug: "oat-latte-bottle",
      quantity: 1,
      attributes: {
        "الحجم": "كبير",
      },
    },
  ],
  "restaurant-demo": [
    {
      productIdOrSlug: "rush-combo",
      quantity: 1,
      attributes: {
        "نوع الوجبة": "بطاطس عادية",
        "المشروب": "سيتروس فيز",
      },
    },
    {
      productIdOrSlug: "volcano-fries",
      quantity: 1,
      attributes: {
        "الحجم": "متوسط",
        "الصوص": "جبنة هالبينو",
      },
    },
    {
      productIdOrSlug: "citrus-fizz",
      quantity: 1,
      attributes: {
        "الحجم": "كبير",
      },
    },
  ],
  "max-care-go": [
    {
      productIdOrSlug: "cough-relief-syrup",
      quantity: 1,
      attributes: {
        "النكهة": "عسل وليمون",
      },
    },
    {
      productIdOrSlug: "digital-thermometer",
      quantity: 1,
      attributes: {
        "اللون": "أبيض",
      },
    },
    {
      productIdOrSlug: "first-aid-kit",
      quantity: 1,
      attributes: {
        "الحجم": "منزلي",
      },
    },
  ],
  "district-market": [
    {
      productIdOrSlug: "dm-clip-lid-set",
      quantity: 1,
      attributes: {
        "اللون": "بيج رملي",
      },
    },
    {
      productIdOrSlug: "dm-thermal-bottle",
      quantity: 1,
      attributes: {
        "السعة": "750 مل",
      },
    },
    {
      productIdOrSlug: "dm-drawer-organizer",
      quantity: 1,
      attributes: {
        "المقاس": "متوسط",
      },
    },
  ],
  "men-shoes-eg": [
    {
      productIdOrSlug: "stride-core-runner",
      quantity: 1,
      variantId: "stride-core-runner-race-red-size-42",
      attributes: {
        "اللون": "أحمر سباق",
        "المقاس": "42",
      },
    },
    {
      productIdOrSlug: "city-white-court",
      quantity: 1,
      variantId: "city-white-court-court-white-size-43",
      attributes: {
        "اللون": "أبيض ملعب",
        "المقاس": "43",
      },
    },
    {
      productIdOrSlug: "flex-knit-runner",
      quantity: 1,
      variantId: "flex-knit-runner-charcoal-size-42",
      attributes: {
        "اللون": "فحمي داكن",
        "المقاس": "42",
      },
    },
  ],
  "closet-os": [
    {
      productIdOrSlug: "closet-weekday-poplin",
      quantity: 1,
      variantId: "closet-weekday-poplin-cloud-size-M",
      attributes: {
        "اللون": "أبيض سحابي",
        "المقاس": "M",
      },
    },
    {
      productIdOrSlug: "closet-commute-trouser",
      quantity: 1,
      variantId: "closet-commute-trouser-size-32",
      attributes: {
        "المقاس": "32",
      },
    },
    {
      productIdOrSlug: "closet-relay-tee",
      quantity: 1,
      variantId: "closet-relay-tee-size-L",
      attributes: {
        "المقاس": "L",
      },
    },
  ],
  "women-fashion-eg": [
    {
      productIdOrSlug: "dusk-block-heel",
      quantity: 1,
      variantId: "dusk-block-heel-wine-berry-size-37",
      attributes: {
        "اللون": "عنابي",
        "المقاس": "37",
      },
    },
    {
      productIdOrSlug: "silk-print-scarf",
      quantity: 1,
      variantId: "silk-print-scarf-blush-print",
      attributes: {
        "اللون": "وردي هادئ",
      },
    },
    {
      productIdOrSlug: "berry-crossbody-bag",
      quantity: 1,
      variantId: "berry-crossbody-bag-berry",
      attributes: {
        "اللون": "عنابي",
      },
    },
  ],
  "solea-femme": [
    {
      productIdOrSlug: "solea-femme-cloud-sneaker",
      quantity: 1,
      variantId: "solea-femme-cloud-sneaker-pearl-size-37",
      attributes: {
        "اللون": "أبيض لؤلؤي",
        "المقاس": "37",
      },
    },
    {
      productIdOrSlug: "solea-femme-brace-heel",
      quantity: 1,
      variantId: "solea-femme-brace-heel-rose-size-38",
      attributes: {
        "اللون": "وردي هادئ",
        "المقاس": "38",
      },
    },
    {
      productIdOrSlug: "solea-femme-summer-sandal",
      quantity: 1,
      variantId: "solea-femme-summer-sandal-sand-size-39",
      attributes: {
        "اللون": "بيج رملي",
        "المقاس": "39",
      },
    },
  ],
  "perfume-eg": [
    {
      productIdOrSlug: "amber-veil-elixir",
      quantity: 1,
      variantId: "amber-veil-elixir-100ml",
      attributes: {
        "الحجم": "100 مل",
      },
    },
    {
      productIdOrSlug: "signature-discovery-set",
      quantity: 1,
      variantId: "signature-discovery-set-4x10",
      attributes: {
        "الحجم": "4 × 10 مل",
      },
    },
    {
      productIdOrSlug: "velvet-gift-box",
      quantity: 1,
      variantId: "velvet-gift-box-classic",
      attributes: {
        "الحجم": "تغليف كلاسيك",
      },
    },
  ],
  "elegant-luxe": [
    {
      productIdOrSlug: "elegant-luxe-satin-signature-dress",
      quantity: 1,
      variantId: "elegant-luxe-satin-signature-dress-ivory-size-S",
      attributes: {
        "اللون": "أوف وايت",
        "المقاس": "S",
      },
    },
    {
      productIdOrSlug: "elegant-luxe-lumi-evening-set",
      quantity: 1,
      variantId: "elegant-luxe-lumi-evening-set-pearl-size-S",
      attributes: {
        "اللون": "أوف وايت",
        "المقاس": "S",
      },
    },
    {
      productIdOrSlug: "elegant-luxe-crystal-line-heel",
      quantity: 1,
      variantId: "elegant-luxe-crystal-line-heel-pearl-size-37",
      attributes: {
        "اللون": "أبيض لؤلؤي",
        "المقاس": "37",
      },
    },
  ],
  "kids-play": [
    {
      productIdOrSlug: "rocket-blocks-lab",
      quantity: 1,
      variantId: "rocket-blocks-lab-builder-120",
      attributes: {
        "عدد القطع": "120 قطعة",
        "النسخة": "موسعة",
      },
    },
    {
      productIdOrSlug: "junior-scooter-lite",
      quantity: 1,
      variantId: "junior-scooter-lite-aqua",
      attributes: {
        "اللون": "أزرق سماوي",
      },
    },
    {
      productIdOrSlug: "splash-art-kit",
      quantity: 1,
      variantId: "splash-art-kit-deluxe",
      attributes: {
        "النسخة": "ديلوكس",
        "المحتوى": "مريلة + 24 لون",
      },
    },
  ],
  "pc-hub-eg": [
    {
      productIdOrSlug: "workbook-14-air",
      quantity: 1,
      variantId: "workbook-14-air-16-1tb-silver",
      attributes: {
        "الرام": "16GB",
        "التخزين": "1TB SSD",
        "اللون": "فضي",
      },
    },
    {
      productIdOrSlug: "quadview-27-qhd",
      quantity: 1,
      variantId: "quadview-27-qhd-165hz",
      attributes: {
        "المقاس": "27 بوصة",
        "الدقة": "QHD",
        "الانتعاش": "165Hz",
      },
    },
    {
      productIdOrSlug: "precision-mouse-lite",
      quantity: 1,
      variantId: "precision-mouse-lite-graphite",
      attributes: {
        "اللون": "جرافيت",
      },
    },
  ],
  "rose-boutique-eg": [
    {
      productIdOrSlug: "rose-midi-dress",
      quantity: 1,
      variantId: "rose-midi-dress-rose-smoke-size-M",
      attributes: {
        "اللون": "وردي دخاني",
        "المقاس": "M"
      }
    },
    {
      productIdOrSlug: "arc-mini-bag",
      quantity: 1,
      variantId: "arc-mini-bag-berry",
      attributes: {
        "اللون": "عنابي"
      }
    },
    {
      productIdOrSlug: "silk-ribbon-scarf",
      quantity: 1,
      variantId: "silk-ribbon-scarf-rose-print",
      attributes: {
        "اللون": "وردي مطبوع"
      }
    }
  ],
  "fastly-eg": [
    {
      productIdOrSlug: "moon-prayer-rug-speaker",
      quantity: 1,
    },
    {
      productIdOrSlug: "bubble-maker-double-pack",
      quantity: 1,
    },
    {
      productIdOrSlug: "solar-garden-lights-triple-pack",
      quantity: 1,
    },
  ],
  "vela-fashion-eg": [
    {
      productIdOrSlug: "petal-slip-dress",
      quantity: 1,
      variantId: "petal-slip-dress-green-XL",
      attributes: {
        Color: "Mint",
        Size: "XL",
      },
    },
    {
      productIdOrSlug: "melt-tote-bag",
      quantity: 1,
      variantId: "melt-tote-bag-black-S",
      attributes: {
        Color: "Black",
      },
    },
    {
      productIdOrSlug: "coral-curve-skirt",
      quantity: 1,
      variantId: "coral-curve-skirt-pink-S",
      attributes: {
        Color: "Coral Pink",
        Size: "S",
      },
    },
  ],
  ...ELESSI_PACK_CART_SEEDS,
};

export const getMarketplacePreviewCartItems = (
  previewThemeId = resolveMarketplacePreviewThemeId(),
): CartItem[] => {
  if (!previewThemeId) {
    return [];
  }

  const explicitSeeds = previewCartSeedsByTheme[previewThemeId] || [];
  const seeds =
    explicitSeeds.length > 0
      ? explicitSeeds
      : (getMarketplacePreviewProducts({ limit: 3 }, previewThemeId)?.data || []).map(
          (product) => {
            const firstVariant = (
              product.productVariants ||
              product.variants ||
              []
            )[0];

            return {
              productIdOrSlug: product.id,
              quantity: 1,
              variantId: firstVariant?.id,
              attributes: firstVariant?.attributes || {},
            } satisfies PreviewCartSeed;
          },
        );

  return seeds
    .map((seed) => {
      const product = getMarketplacePreviewProduct(seed.productIdOrSlug, previewThemeId);
      if (!product) {
        return null;
      }

      const attributes = seed.attributes || {};
      const selectedVariant =
        seed.variantId &&
        (product.productVariants || product.variants || []).find(
          (variant) => variant.id === seed.variantId,
        );
      const resolvedPrice =
        typeof selectedVariant?.price === "number" ? selectedVariant.price : product.price;
      const resolvedImage =
        (typeof selectedVariant?.image === "string" && selectedVariant.image) ||
        (typeof product.mainImage === "string" && product.mainImage) ||
        (Array.isArray(product.images) ? product.images[0] : undefined);

      return {
        id: buildCartItemId({
          productId: product.id,
          variantId: seed.variantId || null,
          attributes,
        }),
        productId: product.id,
        variantId: seed.variantId || null,
        name: product.name,
        price: resolvedPrice,
        basePrice: resolvedPrice,
        quantity: seed.quantity,
        imageUrl: resolvedImage,
        attributes,
      } satisfies CartItem;
    })
    .filter((item): item is CartItem => Boolean(item));
};
