# مقترح دمج قوالب المتجر — 111 → أرشيتايبات (مسودة قرار 2026-11-11)

المصدر: مسح كوربس فعلي (توقيعات home، الخطوط، المعاينات، budget). الإجراء المقترح = **deactivate من الكتالوج** (isActive=false) — صفر حذف ملفات وصفر كسر لأسواق قائمة، وكل قالب يقدر يترجع بقرار.

| الحكم | العدد | المعنى |
|---|---|---|
| keep | 42 | أرشيتايب مستقل يفضل معروض |
| merge-into-family | 21 | نسخة نيتش من عائلة bazaar/lumiere/maison/noor — يتفعل منها الأقوى ويُخفى الباقي |
| merge-into-tpl | 8 | سلسلة tpl-00x التجريبية — توحيد في أرشيتايبات نهائية |
| merge-into-elessi | 12 | حزمة elessi المولّدة — تُعرض كأرشيتايب واحد بحضور حقيقي |
| review-duplicate | 22 | توقيع home مكرر مع قالب آخر — قرار يدوي |
| review-ltr | 5 | LTR في كتالوج RTL-first — يظل متاحًا فقط عند طلب تجار |
| retire | 3 | legacy/dead |

## العائلات الأربع (24 قالب = 4 تركيبات × 6 نيتشات) — يُحتفظ بالممثل الأول ويُخفى الباقي
- **-bazaar**: keep `bags-bazaar` · merge: kids-fashion-bazaar, menswear-bazaar, modest-wear-bazaar, shoes-bazaar, smart-bazaar, women-fashion-bazaar
- **-lumiere**: keep `bags-lumiere` · merge: kids-fashion-lumiere, menswear-lumiere, modest-wear-lumiere, shoes-lumiere, women-fashion-lumiere
- **-maison**: keep `bags-maison` · merge: kids-fashion-maison, menswear-maison, modest-wear-maison, shoes-maison, women-fashion-maison
- **-noor**: keep `bags-noor` · merge: kids-fashion-noor, menswear-noor, modest-wear-noor, shoes-noor, women-fashion-noor

## الجدول الكامل

| id | فئة | عائلة | عربي-first | اتجاه | معاينة | oversized | توقيع home مشترك × | الحكم |
|---|---|---|---|---|---|---|---|---|
| modern-minimal | fashion | - | ✅ | rtl | remote-unsplash | - | 4 | review-duplicate |
| academy-little-coders | education | - | ✅ | rtl | real | - | 1 | keep |
| airlume-ai | services | - | ✅ | rtl | missing | - | 1 | keep |
| allure | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| anjella-boutique | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| atelier-nova | fashion | - | ✅ | rtl | real | ⚠️ | 1 | keep |
| aura-chic | fashion | - | ✅ | rtl | real | - | 3 | review-duplicate |
| bags-bazaar | general | bazaar | ✅ | rtl | flat-tile | - | 7 | keep |
| bags-lumiere | general | lumiere | ✅ | rtl | remote-unsplash | - | 6 | keep |
| bags-maison | general | maison | ✅ | rtl | remote-unsplash | - | 6 | keep |
| bags-noor | general | noor | ✅ | rtl | remote-unsplash | - | 7 | keep |
| baladi-market-eg | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| bloom-studio | gifts | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| bold-fashion | fashion | - | ✅ | rtl | remote-unsplash | - | 3 | retire |
| butcher-counter-eg | food | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| butcher-shop-eg | food | - | ✅ | rtl | remote-unsplash | - | 7 | review-duplicate |
| cafe-demo | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| cairo-stride | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| closet-os | fashion | - | ✅ | rtl | real | - | 4 | review-duplicate |
| couture-atelier-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| crafted | handmade | - | ✅ | rtl | missing | - | 1 | keep |
| creative-portfolio | creative | - | ✅ | rtl | remote-unsplash | ⚠️ | 1 | keep |
| cutline-club | fashion | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| dental-lab-elite | medical | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| district-market | general | - | ✅ | rtl | real | - | 1 | keep |
| electronics-demo | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| elegant-luxe | fashion | - | ✅ | rtl | flat-tile | ⚠️ | 6 | review-duplicate |
| elessi-carry-lane | fashion | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-chrono-gallery | luxury | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-garage-fit | automotive | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-gem-atelier | luxury | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-glow-routine | beauty | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-harvest-fold | grocery | - | ❌ | rtl | real | - | 13 | retire |
| elessi-pedal-lab | sports | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-signal-deck | electronics | - | ❌ | rtl | missing | - | 13 | merge-into-elessi |
| elessi-sprout-room | plants-garden | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| elessi-tail-supply | pets | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| fakhama-elite | fashion | - | ✅ | rtl | none | - | 1 | keep |
| fastly-eg | general | - | ✅ | rtl | real | - | 1 | keep |
| fitting-room-studio | fashion | - | ❌ | ltr | remote-unsplash | - | 1 | review-ltr |
| fresh-cart | grocery | - | ✅ | rtl | missing | - | 4 | review-duplicate |
| furniture-demo | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| hayah-modest-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 2 | review-duplicate |
| ink-paper | books | - | ✅ | rtl | remote-unsplash | - | 4 | review-duplicate |
| iron-forge | sports | - | ✅ | rtl | remote-unsplash | - | 4 | review-duplicate |
| khemet-fashion-eg | fashion | - | ✅ | rtl | remote-unsplash | ⚠️ | 1 | keep |
| khemet-general-eg | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| khemet-luxe-eg | fashion | - | ✅ | rtl | remote-unsplash | ⚠️ | 6 | review-duplicate |
| khemet-luxe-v2 | fashion | - | ✅ | rtl | remote-unsplash | ⚠️ | 1 | keep |
| kids-fashion-bazaar | general | bazaar | ✅ | rtl | flat-tile | - | 7 | merge-into-family |
| kids-fashion-lumiere | general | lumiere | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| kids-fashion-maison | general | maison | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| kids-fashion-noor | general | noor | ✅ | rtl | remote-unsplash | - | 7 | merge-into-family |
| kids-play | kids | - | ❌ | rtl | remote-unsplash | - | 1 | keep |
| layali-edit-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 2 | review-duplicate |
| legacy-default-old | fashion | - | ❌ | ltr | real | - | 1 | retire |
| look-atelier-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| marketplace-avenue | general | - | ❌ | ltr | remote-unsplash | - | 2 | review-ltr |
| marketplace-avenue-ar | general | - | ✅ | rtl | remote-unsplash | - | 2 | review-duplicate |
| max-care-go | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| men-shoes-eg | fashion | - | ✅ | rtl | real | - | 1 | keep |
| mens-grooming-pro | general | - | ❌ | ltr | remote-unsplash | - | 1 | review-ltr |
| menswear-bazaar | general | bazaar | ✅ | rtl | flat-tile | - | 7 | merge-into-family |
| menswear-lumiere | general | lumiere | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| menswear-maison | general | maison | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| menswear-noor | general | noor | ✅ | rtl | remote-unsplash | - | 7 | merge-into-family |
| menswear-prime | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| modest-wear-bazaar | general | bazaar | ✅ | rtl | flat-tile | - | 7 | merge-into-family |
| modest-wear-lumiere | general | lumiere | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| modest-wear-maison | general | maison | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| modest-wear-noor | general | noor | ✅ | rtl | remote-unsplash | - | 7 | merge-into-family |
| mystic-desert | fashion | - | ✅ | rtl | none | - | 6 | review-duplicate |
| nile-bistro | food | - | ✅ | rtl | remote-unsplash | - | 3 | review-duplicate |
| nile-elegance-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 6 | review-duplicate |
| nova-mobile | electronics | - | ❌ | rtl | none | - | 1 | keep |
| opulence | luxury | - | ✅ | rtl | missing | - | 1 | keep |
| pawsome | pets | - | ✅ | rtl | missing | - | 4 | review-duplicate |
| pc-hub-eg | electronics | - | ✅ | rtl | real | - | 1 | keep |
| perfume-eg | beauty | - | ✅ | rtl | remote-unsplash | - | 6 | review-duplicate |
| pharmacy-demo | general | - | ❌ | rtl | remote-unsplash | - | 13 | merge-into-elessi |
| prime-butcher-luxe | general | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| redline-auto | automotive | - | ✅ | rtl | real | ⚠️ | 1 | keep |
| restaurant-demo | general | - | ✅ | rtl | remote-unsplash | - | 3 | review-duplicate |
| rihla-resort-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 4 | review-duplicate |
| rose-boutique-eg | fashion | - | ✅ | rtl | remote-unsplash | ⚠️ | 1 | keep |
| shoes-bazaar | general | bazaar | ✅ | rtl | flat-tile | - | 7 | merge-into-family |
| shoes-lumiere | general | lumiere | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| shoes-maison | general | maison | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| shoes-noor | general | noor | ✅ | rtl | remote-unsplash | - | 7 | merge-into-family |
| shop-orbit | general | - | ✅ | rtl | missing | - | 1 | keep |
| skill-lab | digital | - | ✅ | rtl | missing | - | 1 | keep |
| smart-bazaar | general | bazaar | ✅ | rtl | real | - | 4 | merge-into-family |
| soft-graceful | fashion | - | ❌ | ltr | real | ⚠️ | 1 | review-ltr |
| solea-femme | fashion | - | ✅ | rtl | remote-unsplash | - | 1 | keep |
| style-store-eg | fashion | - | ❌ | rtl | real | - | 13 | merge-into-elessi |
| tpl-001-bulk-commerce-women-fashion | fashion | - | ✅ | rtl | real | - | 1 | merge-into-tpl |
| tpl-002-marketplace-multi-women-fashion | fashion | - | ✅ | rtl | real | - | 1 | merge-into-tpl |
| tpl-003-local-market-women-fashion | fashion | - | ✅ | rtl | real | - | 2 | merge-into-tpl |
| tpl-004-original-women-fashion | fashion | - | ✅ | rtl | real | - | 1 | merge-into-tpl |
| tpl-009-modular-catalog-kids-fashion | fashion | - | ✅ | rtl | real | - | 1 | merge-into-tpl |
| tpl-010-multi-department-kids-fashion | fashion | - | ✅ | rtl | real | - | 7 | merge-into-tpl |
| tpl-011-local-market-kids-fashion | fashion | - | ✅ | rtl | real | - | 2 | merge-into-tpl |
| tpl-012-original-kids-fashion | fashion | - | ✅ | rtl | real | - | 1 | merge-into-tpl |
| turbo-parts | automotive | - | ✅ | rtl | missing | - | 3 | review-duplicate |
| vanguard-premium | general | - | ✅ | rtl | missing | - | 3 | review-duplicate |
| vela-fashion-eg | fashion | - | ❌ | ltr | real | - | 1 | review-ltr |
| velvet-glow | beauty | - | ✅ | rtl | missing | - | 1 | keep |
| women-fashion-bazaar | general | bazaar | ✅ | rtl | flat-tile | - | 7 | merge-into-family |
| women-fashion-eg | fashion | - | ✅ | rtl | remote-unsplash | - | 6 | review-duplicate |
| women-fashion-lumiere | general | lumiere | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| women-fashion-maison | general | maison | ✅ | rtl | remote-unsplash | - | 6 | merge-into-family |
| women-fashion-noor | general | noor | ✅ | rtl | remote-unsplash | - | 7 | merge-into-family |
| zen-organic | general | - | ✅ | rtl | remote-unsplash | ⚠️ | 1 | keep |
