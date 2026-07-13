/**
 * Admin Section Registry Initialization
 *
 * Registers Admin / Page-Builder section types with the dynamic section registry.
 * All keys use the "admin:" namespace prefix to avoid collisions with
 * storefrontSectionRegistry keys (hero, products, features, etc.).
 *
 * Import this file once at Admin app startup.
 */

import { registerSections } from "./sectionRegistry";

import HeroSection from "../components/homepage/HeroSection";
import HeroGridSection from "../components/homepage/HeroGridSection";
import FeaturesSection from "../components/homepage/FeaturesSection";
import ProductsSection from "../components/homepage/ProductsSection";
import BannerSection from "../components/homepage/BannerSection";
import CategoriesSection from "../components/homepage/CategoriesSection";
import TestimonialsSection from "../components/homepage/TestimonialsSection";
import CustomSection from "../components/homepage/CustomSection";
import CountdownSection from "../components/homepage/CountdownSection";
import VideoSection from "../components/homepage/VideoSection";
import FAQSection from "../components/homepage/FAQSection";
import NewsletterSection from "../components/homepage/NewsletterSection";
import GallerySection from "../components/homepage/GallerySection";
import TabsSection from "../components/homepage/TabsSection";
import PricingSection from "../components/homepage/PricingSection";
import TeamSection from "../components/homepage/TeamSection";
import MapSection from "../components/homepage/MapSection";
import BrandsSection from "../components/homepage/BrandsSection";

// All keys prefixed with "admin:" to isolate from storefront section keys
registerSections({
  "admin:hero":         HeroSection,
  "admin:hero_grid":    HeroGridSection,
  "admin:features":     FeaturesSection,
  "admin:products":     ProductsSection,
  "admin:banner":       BannerSection,
  "admin:categories":   CategoriesSection,
  "admin:testimonials": TestimonialsSection,
  "admin:custom":       CustomSection,
  "admin:countdown":    CountdownSection,
  "admin:video":        VideoSection,
  "admin:faq":          FAQSection,
  "admin:newsletter":   NewsletterSection,
  "admin:gallery":      GallerySection,
  "admin:tabs":         TabsSection,
  "admin:pricing":      PricingSection,
  "admin:team":         TeamSection,
  "admin:map":          MapSection,
  "admin:brands":       BrandsSection,
});
