/**
 * FooterVogue — Luxury / Editorial Footer
 * Pure presentation component.
 */
import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { FooterSettings } from "../../../services/footerSettingsService";
import { withStorefrontCompany } from "../../../utils/storefrontLinks";

interface FooterVogueProps {
    companyId: string | null;
    settings: FooterSettings;
    storePages: Array<{ id: string; title: string; slug: string }>;
}

const FooterVogue: React.FC<FooterVogueProps> = ({ companyId, settings, storePages }) => {
    const handleLinkClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const coreLinks = [
        { label: "المنتجات", path: "/shop" },
        { label: "السلة", path: "/shop/cart" },
        { label: "تتبع الطلب", path: "/shop/track-order" },
        { label: "تواصل معنا", path: "/contact" },
    ];

    const year = new Date().getFullYear().toString();

    return (
        <footer
            className="storefront-footer mt-auto"
            style={{
                background: "var(--theme-color-bg, #0A0A0A)",
                borderTop: "1px solid var(--theme-accent, #C9A96E)",
                padding: "5rem 0 2.5rem",
                color: "var(--theme-color-text, #F5F0EB)",
            }}
        >
            <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 2rem" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "3rem",
                        marginBottom: "4rem",
                    }}
                >
                    {/* Brand */}
                    {settings.showAboutStore && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                            <h2
                                style={{
                                    fontFamily: "var(--theme-font-heading, 'Playfair Display', serif)",
                                    fontSize: "1.5rem",
                                    letterSpacing: "0.15em",
                                    fontWeight: 400,
                                    color: "var(--theme-accent, #C9A96E)",
                                    margin: 0,
                                }}
                            >
                                {settings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() || "المتجر"}
                            </h2>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    lineHeight: 1.9,
                                    opacity: 0.65,
                                    letterSpacing: "0.05em",
                                    margin: 0,
                                }}
                            >
                                {settings.aboutStore}
                            </p>
                        </div>
                    )}

                    {/* Store Links */}
                    {settings.showQuickLinks && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                            <h4
                                style={{
                                    fontSize: "0.65rem",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.3em",
                                    fontWeight: 700,
                                    color: "var(--theme-accent, #C9A96E)",
                                    margin: 0,
                                }}
                            >
                                تصفح المتجر
                            </h4>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                {coreLinks.map((item) => (
                                    <li key={item.path + item.label}>
                                        <Link
                                            to={withStorefrontCompany(item.path, companyId)}
                                            onClick={handleLinkClick}
                                            style={{
                                                fontSize: "0.7rem",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.2em",
                                                opacity: 0.6,
                                                textDecoration: "none",
                                                color: "inherit",
                                                transition: "opacity 0.2s",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Contact */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                        <h4
                            style={{
                                fontSize: "0.65rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.3em",
                                fontWeight: 700,
                                color: "var(--theme-accent, #C9A96E)",
                                margin: 0,
                            }}
                        >
                            التواصل
                        </h4>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                            {settings.showEmail && settings.email && (
                                <li>
                                    <a
                                        href={`mailto:${settings.email}`}
                                        style={{ fontSize: "0.7rem", letterSpacing: "0.1em", opacity: 0.6, textDecoration: "none", color: "inherit" }}
                                    >
                                        {settings.email}
                                    </a>
                                </li>
                            )}
                            {settings.showPhone && settings.phone && (
                                <li>
                                    <a
                                        href={`tel:${settings.phone}`}
                                        style={{ fontSize: "0.7rem", letterSpacing: "0.1em", opacity: 0.6, textDecoration: "none", color: "inherit" }}
                                    >
                                        {settings.phone}
                                    </a>
                                </li>
                            )}
                            {settings.showAddress && settings.address && (
                                <li style={{ fontSize: "0.7rem", opacity: 0.6 }}>{settings.address}</li>
                            )}
                            {/* Policy links */}
                            {storePages.length > 0 &&
                                storePages.map((page) => (
                                    <li key={page.id}>
                                        <Link
                                            to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)}
                                            style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.45, textDecoration: "none", color: "inherit" }}
                                        >
                                            {page.title}
                                        </Link>
                                    </li>
                                ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                {settings.showCopyright && (
                    <div
                        style={{
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            paddingTop: "2rem",
                            textAlign: "center",
                            fontSize: "0.6rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.3em",
                            opacity: 0.35,
                        }}
                    >
                        {settings.copyrightText?.replace("{year}", year) || `© ${year} المتجر. جميع الحقوق محفوظة.`}
                    </div>
                )}
            </div>
        </footer>
    );
};

export default FooterVogue;
