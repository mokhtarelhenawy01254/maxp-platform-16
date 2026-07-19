/**
 * FooterMagazine — Restaurant / Food / Grill Footer
 * Pure presentation component.
 */
import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { FooterSettings } from "../../../services/footerSettingsService";
import { withStorefrontCompany } from "../../../utils/storefrontLinks";

interface FooterMagazineProps {
    companyId: string | null;
    settings: FooterSettings;
    storePages: Array<{ id: string; title: string; slug: string }>;
}

const FooterMagazine: React.FC<FooterMagazineProps> = ({ companyId, settings, storePages }) => {
    const handleLinkClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const year = new Date().getFullYear().toString();
    const brandName = settings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() || "المطعم";
    const coreLinks = [
        { label: "المنتجات", path: "/shop" },
        { label: "السلة", path: "/shop/cart" },
        { label: "تتبع الطلب", path: "/shop/track-order" },
        { label: "الأسئلة الشائعة", path: "/faq" },
        { label: "تواصل معنا", path: "/contact" },
    ];

    return (
        <footer
            style={{
                background: "var(--theme-color-bg, #140F0B)",
                color: "var(--theme-color-text, #FFF6EC)",
                marginTop: "auto",
                overflow: "hidden",
            }}
        >
            {/* Accent divider */}
            <div style={{ height: "4px", background: "var(--theme-accent, #FF6A2F)" }} />

            {/* Main */}
            <div
                style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "4rem 2rem",
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr",
                    gap: "4rem",
                }}
            >
                {/* Brand half */}
                <div>
                    <h2
                        style={{
                            fontFamily: "var(--theme-font-heading, 'Cairo', sans-serif)",
                            fontSize: "clamp(2rem, 5vw, 3.5rem)",
                            fontWeight: 700,
                            lineHeight: 1.1,
                            margin: "0 0 1.5rem",
                            color: "var(--theme-accent, #FF6A2F)",
                        }}
                    >
                        {brandName}
                    </h2>
                    {settings.showAboutStore && (
                        <p style={{ fontSize: "0.9rem", lineHeight: 1.9, opacity: 0.65, maxWidth: "380px", margin: "0 0 2rem" }}>
                            {settings.aboutStore}
                        </p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {settings.showPhone && settings.phone && (
                            <a
                                href={`tel:${settings.phone}`}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    color: "var(--theme-accent, #FF6A2F)",
                                    textDecoration: "none",
                                }}
                            >
                                📞 {settings.phone}
                            </a>
                        )}
                        {settings.showEmail && settings.email && (
                            <a
                                href={`mailto:${settings.email}`}
                                style={{ fontSize: "0.82rem", opacity: 0.6, textDecoration: "none", color: "inherit" }}
                            >
                                {settings.email}
                            </a>
                        )}
                        {settings.showAddress && settings.address && (
                            <p style={{ fontSize: "0.82rem", opacity: 0.6, margin: 0 }}>{settings.address}</p>
                        )}
                    </div>
                </div>

                {/* Links half */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "2rem",
                        alignSelf: "start",
                        paddingTop: "0.5rem",
                    }}
                >
                    {settings.showQuickLinks && (
                        <div>
                            <h4 style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.25em", opacity: 0.45, margin: "0 0 1rem" }}>
                                تصفح
                            </h4>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {coreLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            to={withStorefrontCompany(item.path, companyId)}
                                            onClick={handleLinkClick}
                                            style={{ fontSize: "0.82rem", opacity: 0.65, textDecoration: "none", color: "inherit", transition: "opacity 0.2s" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.65")}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {storePages.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.25em", opacity: 0.45, margin: "0 0 1rem" }}>
                                قانوني
                            </h4>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {storePages.map((page) => (
                                    <li key={page.id}>
                                        <Link
                                            to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)}
                                            style={{ fontSize: "0.82rem", opacity: 0.65, textDecoration: "none", color: "inherit" }}
                                        >
                                            {page.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom strip */}
            <div
                style={{
                    background: "var(--theme-accent, #FF6A2F)",
                    padding: "1rem 2rem",
                    textAlign: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#fff",
                }}
            >
                {settings.showCopyright
                    ? settings.copyrightText?.replace("{year}", year) || `© ${year} ${brandName}`
                    : `© ${year} ${brandName}`}
            </div>
        </footer>
    );
};

export default FooterMagazine;
