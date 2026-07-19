export interface LuxeNavLink {
  label: string;
  href: string;
}

export interface LuxeImage {
  src: string;
  alt: string;
}

export interface LuxeCta {
  label: string;
  href: string;
}

export interface LuxeHeroData {
  badge: string;
  titleLines: string[];
  description: string;
  primaryCta: LuxeCta;
  secondaryCta: LuxeCta;
  image: LuxeImage;
}

export interface LuxeTrendingItem {
  title: string;
  price: string;
  image: LuxeImage;
}

export interface LuxeCategoryItem {
  label: string;
  image: LuxeImage;
}

export interface LuxePromoItem {
  titleLines: string[];
  description: string;
  cta: LuxeCta;
  image: LuxeImage;
}

export interface LuxeGalleryItem {
  image: LuxeImage;
  offset?: boolean;
}

export interface LuxeJournalItem {
  tag: string;
  title: string;
  description: string;
  image: LuxeImage;
}

export interface LuxeNewsletterData {
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  helper: string;
}

export interface LuxeShopSpotlightData {
  title: string;
  subtitle: string;
  description: string;
  cta: LuxeCta;
  image: LuxeImage;
  highlight: string;
}

export const luxeNavLinks: LuxeNavLink[] = [
  { label: "المجموعات", href: "#collections" },
  { label: "الجديد", href: "#arrivals" },
  { label: "اللوكبوك", href: "#lookbook" },
  { label: "المجلة", href: "#journal" },
];

export const luxeHero: LuxeHeroData = {
  badge: "مجموعة الأناقة 2024",
  titleLines: ["فخامة هادئة", "بلمسة جديدة"],
  description:
    "اختبري جوهر الأزياء البسيطة مع تشكيلة مختارة بعناية من قطع خالدة بخامات طبيعية فائقة الجودة.",
  primaryCta: { label: "تسوق المجموعة", href: "#collections" },
  secondaryCta: { label: "استكشف اللوكبوك", href: "#lookbook" },
  image: {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAxsYKI1A3Maz8liI6GSHwnCY5E2zFUJ39Q-3xzkt8PZ0oiBItd0epYQcqbv92qa2HfK0d2H9aA6pzXPqGaKn-FKrNWsx0dEAorpM-I7nVXLTxZ6k8iLWO3odG7Kd9QSvR85Bt3wwur2YJqvyvKj7x85cYwippQ9Odw5lWiYtGO4u8_XtLyx3X0BEdTKSJRnJuRPpYTmOcBKzG6aUVyLxgfwjadNmcjS4NYYOPJLY6RKPjR7cb-CXRZym62qpbFE4pY7m2-vsuBwnZc",
    alt: "سيدة ترتدي معطفاً بيج أنيقاً بطابع بسيط",
  },
};

export const luxeTrending = {
  title: "الأكثر رواجاً",
  subtitle: "القطع المحببة هذا الأسبوع",
  viewAll: { label: "عرض الكل", href: "#trending" },
  items: [
    {
      title: "فستان حرير انسيابي",
      price: "٢٩٠ ج.م",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAF4WBc-51MYGgxgwqB_KxgQQFjkoJI3kkr2ARyHprSltMSatZR33Sbtd_Emu2hCBcpbqyGTNrz3PiprSvJiknWldbCltnQhB-nD3kow_5RvMSphe5UTBOz9Me4zx2K81ISY86iGvLwozKSjbLF___GWxnT1NBcYMlzeZJla5MHUK5fzHEfg1WwkrbMGRwG3vRBtWsmTLWNpSuZmxnQCipa2c9zIojbaE--WWUzpp6yRns-l2rVK5GqyajMGBmwwL28m6_-wDC5ZoAb",
        alt: "فستان حريري بلون الشامبانيا",
      },
    },
    {
      title: "بنطال كشمير مفصّل",
      price: "٤٥٠ ج.م",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAw_vk9WHMWpD1lKr3D2l4ACc2OWc-YLuchf5ctSz5PSpzl0k562GxO-1enEF-SCxRb43cZyZvyokhDxErFtb4pG3RZnSoJnqSibcm84kMawrTV19S37jsQNpOGaviQeQ1e65ZURuPMlQzDa9E7Otu7GypIE5PRSR68ECSzeEYxXPY_Wz733SnZhHCUdKq1RKmpXZIbcQTeYsLfG_EIknSgYc1XLVB24CK4dJzJHhBDqtil9N5YlLMxpTbSisP9ONmlv_5ZdQBey_M",
        alt: "بنطال كشمير بتفاصيل دقيقة",
      },
    },
    {
      title: "بليزر صوفي مصقول",
      price: "٥٨٠ ج.م",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDvywoLYenXP0SW2QX0FvQQAbUsQ2ixkKkuK1GXHNboS5fkLwQMrcJST4BaLeqvwdQK2o4h8SzWrYIeHKO2QQdBbRzD_eKbVLbvsqfNCuTojtEjqk_zliwALo1GvrxZ__L9lTOH1wjx0IfguSf0Hexl2RAt9pzTy0bJXS_Qx0PJ-5bVRhkNhabn3dQ1ceo4FZ1LkRUvwEcE9vevhD_vgKp0rMAxMy4AI9r2skjp0A99muG1z1N-OUpIOpfgcS1M6k24Wzy5kKsKEI4g",
        alt: "بليزر صوفي بقصة هيكلية",
      },
    },
    {
      title: "حقيبة جلدية بسيطة",
      price: "٣٢٠ ج.م",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKzZ2RwBbwq4nlw_r2iXKSPgmRLGIiid_cTq-iJxFU61QpbbIBpv7JtpC1tgddZg5OuVfzOMPxU-AzRg7y4-q9Zi9BvCiD4tSLymaXIKlbsaWcNNMmTjwA_Nx9W7eV_1MqBOm8MrSxhFKo31fci1bycc17lWdFFRbzDy4LXrN-YVi7Zg5QQKW2C3DKET_POQNH-UVsKx2NU72YbznWjfHJ697l5CFh75PQcSHPJ4DMH2qRErS4Lt53oN_itBUOvNcxDxcHSe0vrhE_",
        alt: "حقيبة جلدية بنية كلاسيكية",
      },
    },
  ],
};

export const luxeCategories = {
  title: "تسوّقي حسب الفئة",
  items: [
    {
      label: "الأحذية",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBp7mFQvp-hsMlKbQ0uTmIKgOFAeOGcP9YeXIiqzLp7uM45RRbJfA-Sao54aiM4xDzZ5aA-7ca1gIQjldwiM_nLEOxMrwWT9_mjc3cor87lYMxs5Xe5wsBiZe03GSUcd3M7hPkjuUU8vEoWoDHiVMgXLjL639a0r4OEXN1w8SNzXWkSW5zDn171n3aoebw_Xzq381_Kvdj4jOewaLythZJDkOzft6Cs9dnDPwYKo2rB4UTj6z7Fz8UWpYd-daF8jU-HZuqii_rb6GBz",
        alt: "فئة الأحذية",
      },
    },
    {
      label: "الإكسسوارات",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBcL0A5AgS1cY1QaLNMR40faGCHQoHK-_8D7tAh4RacCukrrLODKbbcBevoPDcg28kt33toJDbYV-axRLobGYr7lXHXMVx_cHsEHqIwoQROqpBRI5uDgRxUhTR6Y6FE7WGh_TmubZ_RkLQT2tqOdqZFc2txBav6V6VEuMbPJASnwDPgjWUEkb6cjSDKt2SzDr-7jvQ-AehHtj19-khJJX7Fz1nn3J44xwSwZDGJxBP1xXoED5BUXegGlBJhqE3Bb1l5Nj04nUnqGVen",
        alt: "فئة الإكسسوارات",
      },
    },
    {
      label: "الفساتين",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYOUFNfpOz7Yc2oXo95Xg1PTE1aEUCb7KSmk6bamc_jRmdFB3rrG7ROmZnd6kjU5a03d7C7mecbIQUHDunHbOgMLyAIhfDCKGFn94xPoHESkgVPiNvHC16juSKyl8ySLaAQvNuSZipbqCH1Vm3bk2XRj9i-fnWvAEMzl_1JiTd6CcHVU15u37FZDYnzz9VcK81m-b7DbK8jYJFGdgRCHRFSiqXAs6LKGkTiBe5Nq3pOx5MMNnW24hqgmAhMgN9cbuEyM99cujDIcEI",
        alt: "فئة الفساتين",
      },
    },
    {
      label: "الكنزات",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAaHa2Lxwz6GS9PEh15fprBl39tzsBDHGzyOQbca_B47ewT1EDTIjD2tncGOq9qPcREVl2WaDDr5fXGLfDA4qPoNPwNEsIPXf3n1JO0XfTgRqzqqFdMR4kYThBR6lrdt1eMWhQ2uLFjcyAmyk-FKa378O1wPlLgC9MhX58V7vN6ZBFpb81JJnaqvnxpu2Z_bHj0bDSZtT0buhmLqf5Q-JBhi7_3gmf7Y76VmYGYShBRqNVvueF-mFiUSjwSYH8-J9Ao0-yCdpOi8Z1W",
        alt: "فئة الكنزات",
      },
    },
    {
      label: "المعاطف",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCCXbaxcVm_S0zFsFHqgBiXcq68vYBDwYs7tsS7SVH-ZIQ9BQusDTjMoURcA6KsoLv0wmWvaY7QhyOc1qdAlT6ChCO4t5ASn6AqN8w98szXCmMmnQqeOnn240AoAW-rh3e4z8Tei2JAPNRYGf7kSvS7AdmzK6rvUqJeyPWshi419TiQn_Ikx1bdJ7FDc7Sh0RDKavrkKtS_T6pCiDqH67nqXizWp7i1spc027Tkd3I0xmcEfbIU6Ap2Kpq3qb3AytcDhd1O9xc6i44T",
        alt: "فئة المعاطف",
      },
    },
  ],
};

export const luxePromos: LuxePromoItem[] = [
  {
    titleLines: ["قميص أبيض", "كلاسيكي"],
    description:
      "أساسيات خزانة عصرية بخامة قطن عضوي ناعمة وتفاصيل دقيقة.",
    cta: { label: "تسوقي القطع الأساسية", href: "#" },
    image: {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDE_jeA1DEwpOoOXbLoat7s3KFl3oMEJAkCiUHZZVeDWExEEh6ACpbFhm22w9v6WC-7H4KDiLcoVRkFr8aS5v89oq3ZOocxM-Z3dT0QZF3Qh-x2UU12fa-e67lLrkVJ9WhS1KqFiCZyeV7AVPETzjaslPeWYy79DvXKdgwiy1hC-KLzNMjx4B7grMyQOtwFF9LUj_FdOIedN4RilE4krMKA6fvkammB7i259L1UK3okkh8wa8no5MPgMSXoOwT6KmAyJkJEtkzuCfB_",
      alt: "قميص أبيض كلاسيكي",
    },
  },
  {
    titleLines: ["جاكيت واسع", "الأكتاف"],
    description:
      "قصة جريئة توازن بين البنية القوية والراحة اليومية.",
    cta: { label: "استكشفي الملابس الخارجية", href: "#" },
    image: {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDw1VC-UX9fJn6ipebr_D5Mja_hkxbYNMLjIlgLZtFoLM-C-7EqEE6vth_ZXCd86vShSJolSgTfBE_Jy1nb4ayKFkpmt158Uyhxq5jClLbnlWNcfvwSECy0QynjRQpkxL1YYl_nNnOsXoblwdScUiff-0-R1pZgmi8a7BL1hCY8d5d9ozh29DFo_-4fDwc8wJJLVV_89MId9T4CJvrT_gRrF4-SffZABTgBd44tSddLorDauhNRtoiDGi7maQyE1PQGh81EcHIo2b3K",
      alt: "جاكيت صوفي واسع",
    },
  },
];

export const luxeGallery = {
  title: "اكتشفي ما هو رائج الآن",
  description:
    "تابعي أحدث الإطلالات يومياً لتستلهمي أسلوباً هادئاً بطابع عصري.",
  items: [
    {
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGG2mhbkGgiB_FdUQr_bhY1uVksJrkltmGAhxNe8pR0JoxdhGgZfe7i0tsa5DHXm6h6Ef0sPbwG-YAp30JNZK7PiEBnqrlzYZwQ0hn6aBEN61mH9T_u7NduTn41rUZ1T80JKZyagd6Dzv9UOj3EM9uH-Fez0ijhkerr8__kY9Rc-kyrfxXddBEF2tJCMSfhJkkJU4CQ3NVQrUyqqZBBwLCB5lQ5QemdhSUtvlJKkgCJ2HT_oOc3JOdZ0u3Qjp4muCAcDhhHO5KDOaa",
        alt: "جلسة تصوير أزياء بسيطة",
      },
    },
    {
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsfC2Y6-Odv0HmgVNMk1A0Ym1t8xv0_HffD7VG-8hyVMN004cQckSY9wTfAj29lAJxgKyYZYBW9wfCPtyszu-EWruCWG67StlVtQ2lghqtzbUMKnJlVjoWuGh5J0ZKFihiA_KB9ztv02YBgUk9_XOGCSnltZ_wm3miKDPElREC5C9RIjNIdYC67pf7-c2bfa3lIViCS5x2M0DtlztRGVcGYCZyj5CgiOyIpFgYZrpLqRU4jeAXNHxJwcm71uTvXgBYe-Oeptnm_Mq",
        alt: "أسلوب تسوق فاخر",
      },
      offset: true,
    },
    {
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuB0Nn-jSUlI3M2bWHbLZ4YCpz_ujaTo00YQN3JtXu-wTnJ2r6TW8U9l1yhecElredSUScTNx2AmIhn7GIyXL_iOmC1LDYk2pW9eKa1QrY_5WCS7Xffyf7Xr7Ev3y2qGm7_ubCI0pwkrfhoRgi29eCuerfhE7sUO_91JHV8Sw_VaQa3sQYwhl_WqNdjA56Fu_JVEzfXDemJ46irO49kGGvzYKcyVXVMRh7YdQQ7luagsBsnpRF7NBxYD5GG95IHRFCtzNYaEcoR8aXxV",
        alt: "أناقة شارع بسيطة",
      },
    },
    {
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuD_lDrPrwe7sBIhSBWvplbcC2ZofOn80aJCJ7RNFHlzHuz2X1w50LzJXCrLRwrfpQvPygaqvzDLwyRIRGRI_kpKSU31n8M5iGWdQe9AbeQ_n3O6Cx-LLVTvBIdbjWW6VGPkGatti4I1BEX-sY3bQW2wF7u2wwjxQcHVLLz17JUhhxLF45LkPA8Dj_2IxYg1i2As98TTFKd5P0TsgSRuK31RtVzzLmKhcXOrvpu-uGdkl_OHYLvKqvu4K_LdwTEStk92tEV8S3hNUI9f",
        alt: "إطلالة سهرة أنيقة",
      },
      offset: true,
    },
  ],
};

export const luxeJournal = {
  title: "المجلة",
  subtitle: "رؤى عن الفن والثقافة والتصميم.",
  items: [
    {
      tag: "الجماليات",
      title: "فن العيش بأقل: دليل المساحات البسيطة",
      description:
        "كيف يؤثر الحد الأدنى المعماري على أسلوبك اليومي وخياراتك المستدامة.",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCyBFWIK1oqFdHIOszL6KRy2ORc2EzX42GJwlfVPXFWgxIaY0fKLuPmW9PBeI0ka018AZdHnGONcfR9aYPTpgj3vlflA5VxszmBotYhojw8cOAMkAH-ymBbhl6ZNRFviKCYf34rUjv5DGtR2ppdM_T61KZ0DZVZa7hnlNofDcakYxm_LQz_eqGUB4pRsqSyay1w5v-uFGxD6Hd4llH6I2HasxJ2gysxC-TcqGlnexwFX71qpFGxSeQhdcFyn1b-Qf39wnl7rqUU4R7K",
        alt: "تصميم داخلي بسيط",
      },
    },
    {
      tag: "الاستدامة",
      title: "لماذا الجودة هي رفاهية 2024",
      description:
        "رحلة في خامات الكشمير والحرير العضوي من مصادر مسؤولة.",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9tDxmTe4p_QDp-a7cqkn2RSX7OYWayd19x6riOjCa0unaXkAZPSVEFpAVU47qllCJETClsOLJ2P_TiHStJNq-MGYefH46sDX-W46yNyiEiOeFBysZTpD3mJuVAJ-R0j7F8zO1jiJwbPD9K37WD1166C0HK5Bznj4qkJTOeTlY_RWLz3fhVxpRWf2lKOo0HFvir6LqeCFhkYYe5bKg7JaUnwVhpIf6BjfakIsYPB78LOxB4_szBmns_lJZR-K2cxm6plMQOhSd0FiI",
        alt: "أنسجة صوف عالية الجودة",
      },
    },
    {
      tag: "التنسيق",
      title: "كبسولة ملابس أساسية: سبع قطع لكل موسم",
      description:
        "خطوات لبناء خزانة مرنة تتكيف مع تغير المواسم بسهولة.",
      image: {
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdjHmYJb43e-p3NauQW7pT-ZVnmt03a2V7LM0Oyex_ph-hoeNonW0a9NGsOrpdUVfMB3Sq58pVB9P01m55liXkT72rqmb4swEQwDRsCFxAYa-6siU8cUEM6PM7TbYf066s5c0PkQcMv-R74DuMWNqymVVVEPNF0PELBNgRfcB8zz-FF0SrWy74dN585qx7lKgw3dbAgG_4YrdmYMMx7uPG-xuiwcNPSwOQ5j01SJMd-I6uRAguRTBixAeCj24QXiK5L8zwOxgJkQ42",
        alt: "أزياء منظمة داخل بوتيك",
      },
    },
  ],
};

export const luxeNewsletter: LuxeNewsletterData = {
  title: "انضمّي إلى الدائرة الخاصة",
  description:
    "احصلي على وصول مبكر للتشكيلات الجديدة ودعوات حصرية ومحتوى محرر بعناية.",
  placeholder: "بريدك الإلكتروني",
  buttonLabel: "اشترك الآن",
  helper: "بالاشتراك أنتِ توافقين على الشروط وسياسة الخصوصية.",
};

export const luxeShopSpotlight: LuxeShopSpotlightData = {
  title: "واجهة متجر الأحذية الفاخرة",
  subtitle: "Elessi Boutique",
  description:
    "صفحة متجر كاملة لعرض الأحذية الراقية مع فلاتر جانبية، بحث سريع، وبطاقات منتج تحافظ على روح LUXE.",
  cta: { label: "ادخلي صفحة المتجر", href: "/shop?layout=elessi" },
  image: {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLIqg0leL0TcAnMj-4_8gD1vBJhUx7BVd1FOEZcU40TWma5Bqi4hLO6aQEZMGcMZRJW_J2P_nL-weJ68iAQ0wFuQsP2J44gIHFusDHaUMzwuoShsxNODaM3UItVtKCq4GmJajp0h3UOgr_oxM4o4SwzikgV-0RPmBNzz_TnwQCrQX0B8udJ54Azq8M4H-x4_xHw6_5Rb8uWea2jwe1X0py5fCsOEb8iGgS1-9eA5Q_sdK8RjGAokRh-tITKuswDWhUnXUuMUCSeHeU",
    alt: "حذاء بكعب أنيق بلون بيج على خلفية محايدة",
  },
  highlight: "متجر الأحذية",
};

export interface ElessiNavLink {
  label: string;
  href: string;
  highlight?: boolean;
}

export interface ElessiBreadcrumbItem {
  label: string;
  href?: string;
}

export interface ElessiFilterCategory {
  id: string;
  label: string;
  count: number;
}

export interface ElessiColorOption {
  id: string;
  label: string;
  className: string;
}

export interface ElessiSizeOption {
  id: string;
  label: string;
}

export interface ElessiPromoBanner {
  badge: string;
  titleLines: string[];
  ctaLabel: string;
}

export interface ElessiSortOption {
  value: string;
  label: string;
}

export interface ElessiFooterLink {
  label: string;
  href: string;
}

export interface ElessiFooterColumn {
  title: string;
  links: ElessiFooterLink[];
}

export interface ElessiFooterSocial {
  id: string;
  label: string;
  href: string;
}

export const elessiNavLinks: ElessiNavLink[] = [
  { label: "الرئيسية", href: "/home" },
  { label: "المتجر", href: "/shop" },
  { label: "المجلة", href: "/blog" },
  { label: "تواصل معنا", href: "/contact" },
];

export const elessiBreadcrumbs: ElessiBreadcrumbItem[] = [
  { label: "الرئيسية", href: "/" },
  { label: "السيدات", href: "#women" },
  { label: "الأحذية" },
];

export const elessiFallbackCategories: ElessiFilterCategory[] = [
  { id: "heels", label: "كعب عالٍ", count: 24 },
  { id: "sneakers", label: "سنيكرز", count: 18 },
  { id: "sandals", label: "صنادل", count: 31 },
  { id: "flats", label: "مسطحة", count: 12 },
];

export const elessiSizes: string[] = ["36", "37", "38", "39", "40", "41", "42"];

export const elessiColors: ElessiColorOption[] = [
  { id: "white", label: "أبيض", className: "bg-white border border-slate-200" },
  { id: "black", label: "أسود", className: "bg-slate-900" },
  { id: "sand", label: "رملي", className: "bg-luxe-200" },
  { id: "sage", label: "ساج", className: "bg-luxe-100" },
  { id: "pale", label: "فاتح", className: "bg-luxe-50" },
  { id: "red", label: "أحمر", className: "bg-red-800" },
];

export const elessiPromo: ElessiPromoBanner = {
  badge: "عرض موسمي",
  titleLines: ["مجموعة الصيف", "خصم 20%"],
  ctaLabel: "تسوق الآن",
};

export const elessiSortOptions: ElessiSortOption[] = [
  { value: "createdAt", label: "الترتيب الافتراضي" },
  { value: "price", label: "السعر: الأقل إلى الأعلى" },
  { value: "name", label: "الاسم: أ - ي" },
];

export const elessiFooter = {
  brand: {
    name: "ELESSI",
    description:
      "نعيد تعريف الأناقة العصرية عبر أحذية فاخرة وتصميم بسيط مستوحى من الذوق الهادئ.",
  },
  columns: [
    {
      title: "روابط سريعة",
      links: [
        { label: "من نحن", href: "#about" },
        { label: "مجلتنا", href: "#journal" },
        { label: "الاستدامة", href: "#sustainability" },
        { label: "الوظائف", href: "#careers" },
      ],
    },
    {
      title: "الدعم",
      links: [
        { label: "تواصل مع الدعم", href: "#support" },
        { label: "الشحن والاسترجاع", href: "#shipping" },
        { label: "دليل المقاسات", href: "#size-guide" },
        { label: "تتبع الطلب", href: "#track" },
      ],
    },
  ],
  newsletter: {
    title: "النشرة البريدية",
    description: "اشترك للوصول المبكر وأحدث الأخبار.",
    placeholder: "بريدك الإلكتروني",
    buttonLabel: "انضم الآن",
  },
  socials: [
    { id: "share", label: "مشاركة", href: "#" },
    { id: "web", label: "الموقع", href: "#" },
    { id: "email", label: "البريد", href: "#" },
  ],
  meta: "© 2024 ELESSI Theme. جميع الحقوق محفوظة.",
};

export interface ElessiProductImage {
  src: string;
  alt: string;
}

export interface ElessiProductTabSection {
  title: string;
  description: string;
}

export interface ElessiProductTab {
  id: string;
  label: string;
  summary?: string;
  sections?: ElessiProductTabSection[];
  emptyState?: string;
}

export interface ElessiRelatedProduct {
  id: string;
  name: string;
  price: string;
  image: ElessiProductImage;
}

export const elessiProductFallback = {
  title: "حذاء إليسي المحبوك",
  description:
    "اختبري الراحة اليومية بتصميم محبوك خفيف يمنحك مرونة وأناقة دائمة خلال اليوم.",
  price: 120,
  colorLabel: "بيج رملي",
  sizeLabel: "37",
  image: {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZRxdccdY1ZbQOZOeVQaz9tN-hs3hOPN1JGE-m67hocv8qEGo__OKkODyJxs2APs5otDMynZiIdvbE9NwSxCzawLQgiPWJMHHfcvaZMPlRj3Ee2BZB59XhSxdd2oH7CSaXclv9v8Y9rIQSAPOnTaYJL50cMgyQ5iO1aKgOe6pgnMmZmTvNb1QA08X8y3vQxQUQjpOAgCrTrk_3WAU7lgmbEcORCHV7otLzX8i5aLiST0ErwKn-NDq7YzynziensYrabIC_GS1WHpg6",
    alt: "حذاء نسائي محبوك باللون البيج",
  },
  meta: {
    sku: "EL-KNIT-001",
    category: "أحذية رياضية",
  },
};

export const elessiProductTagsFallback = [
  "محبوك",
  "مريح",
  "مستدام",
  "صيفي",
];

export const elessiProductTabs: ElessiProductTab[] = [
  {
    id: "description",
    label: "الوصف",
    summary:
      "حذاء إليسي المحبوك يجمع بين الدقة التقنية والأناقة الهادئة ليمنحك مظهراً عصرياً بلمسة ناعمة.",
    sections: [
      {
        title: "خامات فائقة",
        description:
          "مصنوع من بوليستر معاد تدويره بنسبة 100% مع بطانة من ألياف مستدامة تمنح تهوية ممتازة.",
      },
      {
        title: "نعل مريح",
        description:
          "نعل خفيف الوزن مزود بأخاديد مرنة لتوفير حركة طبيعية وراحة طوال اليوم.",
      },
    ],
  },
  {
    id: "additional",
    label: "معلومات إضافية",
    summary:
      "تفاصيل دقيقة عن الخامات والقياسات لتأكدي من اختيار المقاس المثالي لاحتياجاتك اليومية.",
    sections: [
      {
        title: "الخامة",
        description: "نسيج محبوك بملمس ناعم مع بطانة قابلة للتنفس.",
      },
      {
        title: "العناية",
        description: "تنظيف جاف أو بمنديل رطب للحفاظ على اللون.",
      },
    ],
  },
  {
    id: "reviews",
    label: "المراجعات (12)",
    emptyState: "لا توجد مراجعات جديدة لهذا المنتج حتى الآن.",
  },
];

export const elessiRelatedSection = {
  title: "أكملي الإطلالة",
  subtitle: "منتجات ذات صلة قد تعجبك",
  ctaLabel: "عرض كل المنتجات",
};

export const elessiRelatedProducts: ElessiRelatedProduct[] = [
  {
    id: "related-1",
    name: "حذاء فلات إليسي",
    price: "٨٥ ج.م",
    image: {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAmzKEiq5mNvt1VsKfbWhjhvHnIT6SVeGpP7LU2VYG5fY0d2TqRm-DmvDlfop5B02jrWush8G2zGmq_kn4WPsUyyAOR_niNZJZN4L_gniv50B-A9itU5rd0r79itRuc3e8vnWHD9y2u5qtZ37ClsOGe9rW83iGrAOiPK3_rnUMOBS2vPAqgwYPlvcSvg3JlMUdcP0GUldC9NOqxShOFWjNtoU_arxD2sfhyEubN3CvpmDUEh4lV1p-O262vwgBo4Ek2Xv33f79W62lX",
      alt: "حذاء مسطح أنيق باللون الأزرق",
    },
  },
  {
    id: "related-2",
    name: "صندل ريفييرا",
    price: "١١٠ ج.م",
    image: {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhpSGUl5nu8X6gIAGfsjwRpG8v9pNVEAkTgU_sGQ87-rc9XsvZQbMYlKGNLNPUxXxf_XZulZrMrk1ostZ-9KCkvKkc9Xe50mS-jbSm6eBiNLryJc-_NVegSxRI-2fqJDDKpVnR2gFdi2qqYQxc9woYpRgskl9lpl3QXM5nBeR4PoHV-J5LEkawdgiZu33NM7DCgOLQLoMcCf5EFsnr_J3WskkwV6FpaZDF5PU-VaycMUkdj1oS7Bph1X9xfALGLeNRD4Q1W2DRrLij",
      alt: "صندل جلدي بلون تان",
    },
  },
  {
    id: "related-3",
    name: "حذاء إليسي الرياضي",
    price: "١٤٠ ج.م",
    image: {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5XyyD-1cDFNRcnl5l7grmTT6WBBgbWL1GkkFdhONOOQWtEttGxBykzSvb29WZMVR9k5trp1f_9a7OJC7fRrNUsXuHeQ8ppVPkH8IxqD1N4w4HlhZUyUH-fMH5GJyGJInrbhDmHz-hLprYZhZXqXQ2EqRlNgxFFasmMsp99QTqVv6JoMJZBeS0EOL4LX9FkVCGepTB2J9aikuLRAQ3I5DqY4TFzMAx6Lusp2_LD9w8q6rdM_KKcSBdCbb9g8Hzf21B9beS5IYrH4zm",
      alt: "حذاء رياضي باللون الرمادي",
    },
  },
  {
    id: "related-4",
    name: "سنيكرز حضري",
    price: "١٥٥ ج.م",
    image: {
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA0QpqXeoFIEiLqY6sC3vFZ3IvMECGgLVmqSUXJ43xoYGtRL-arCHfZe40sHQumMUUt5Ai14DvxNGZwIV_tA45bHadG6gH0Ov7vhrug6jMeyiSG0Ax9Q4NWO_yLzH6QIXVGAeX2pLaHO440uRHIIOYEbJJfPLU5gk6EVjGfrgzYjRaZXe7VArlW9N4SacZPLYOkrETwJ-NQ9CLcaPxfrzOaDk8aYYkOcFWpEYy0LfpvmRJVrbGyFTegIJmyaO0P-xgi0MadaZrgq_en",
      alt: "سنيكرز أبيض بسيط",
    },
  },
];
