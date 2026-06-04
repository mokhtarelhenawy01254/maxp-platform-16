/**
 * FooterCreative — Fashion / Bold / Artistic Footer
 * Pure presentation component.
 */
import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { FooterSettings } from "../../../services/footerSettingsService";
import { withStorefrontCompany } from "../../../utils/storefrontLinks";

interface FooterCreativeProps {
    companyId: string | null;
    settings: FooterSettings;
    storePages: Array<{ id: string; title: string; slug: string }>;
    newsletterEmail: string;
    newsletterStatus: "idle" | "loading" | "success" | "error";
    onNewsletterEmailChange: (email: string) => void;
    onNewsletterSubmit: (e: React.FormEvent) => void;
}

const FooterCreative: React.FC<FooterCreativeProps> = ({
    companyId,
    settings,
    storePages,
    newsletterEmail,
    newsletterStatus,
    onNewsletterEmailChange,
    onNewsletterSubmit,
}) => {
    const handleLinkClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const year = new Date().getFullYear().toString();
    const brandName = settings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() || "المتجر";
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
                background: "var(--theme-accent, #E91E8C)",
                color: "#fff",
                marginTop: "auto",
                overflow: "hidden",
            }}
        >
            {/* Top section */}
            <div
                style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    padding: "5rem 2rem 3rem",
                }}
            >
                {/* Big headline */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "3rem",
                        marginBottom: "4rem",
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "var(--theme-font-heading, 'Playfair Display', serif)",
                            fontSize: "clamp(2.5rem, 6vw, 5rem)",
                            fontWeight: 900,
                            lineHeight: 1,
                            margin: 0,
                            opacity: 0.15,
                            letterSpacing: "-0.02em",
                            flex: "0 0 auto",
                            maxWidth: "60%",
                        }}
                    >
                        {brandName}
                    </h2>

                    {/* Newsletter block */}
                    <div style={{ flex: "0 0 300px", maxWidth: "100%" }}>
                        <p style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "1rem", lineHeight: 1.6 }}>
                            ابقَ على اطلاع بأحدث كولكشنينا
                        </p>
                        {newsletterStatus === "success" ? (
                            <p style={{ fontSize: "1rem", fontWeight: 800 }}>✓ شكراً! انتظر مفاجآتنا 🎉</p>
                        ) : (
                            <form
                                onSubmit={onNewsletterSubmit}
                                style={{ display: "flex", background: "rgba(255,255,255,0.15)", borderRadius: "50px", overflow: "hidden" }}
                            >
                                <input
                                    type="email"
                                    required
                                    value={newsletterEmail}
                                    onChange={(e) => onNewsletterEmailChange(e.target.value)}
                                    placeholder="بريدك الإلكتروني"
                                    style={{
                                        flex: 1,
                                        background: "transparent",
                                        border: "none",
                                        padding: "0.8rem 1.2rem",
                                        color: "#fff",
                                        fontSize: "0.82rem",
                                        outline: "none",
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={newsletterStatus === "loading"}
                                    style={{
                                        background: "#fff",
                                        color: "var(--theme-accent, #E91E8C)",
                                        border: "none",
                                        padding: "0.8rem 1.4rem",
                                        fontWeight: 800,
                                        fontSize: "0.78rem",
                                        cursor: "pointer",
                                        borderRadius: "0 50px 50px 0",
                                    }}
                                >
                                    {newsletterStatus === "loading" ? "..." : "انضم"}
                                </button>
                            </form>
                        )}
                        {newsletterStatus === "error" && (
                            <p style={{ marginTop: "0.75rem", fontSize: "0.82rem", opacity: 0.9 }}>
                                تعذر الاشتراك الآن. حاول مرة أخرى.
                            </p>
                        )}
                    </div>
                </div>

                {/* Links grid */}
                <div
                    style={{
                        display: "flex",
                        gap: "3rem",
                        flexWrap: "wrap",
                        paddingTop: "2rem",
                        borderTop: "1px solid rgba(255,255,255,0.2)",
                    }}
                >
                    {settings.showQuickLinks && (
                        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                            {coreLinks.map((item) => (
                                <Link
                                    key={item.label}
                                    to={withStorefrontCompany(item.path, companyId)}
                                    onClick={handleLinkClick}
                                    style={{
                                        fontSize: "0.82rem",
                                        fontWeight: 600,
                                        color: "#fff",
                                        textDecoration: "none",
                                        opacity: 0.8,
                                        transition: "opacity 0.2s",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                        {settings.showEmail && settings.email && (
                            <a href={`mailto:${settings.email}`} style={{ fontSize: "0.82rem", color: "#fff", opacity: 0.7, textDecoration: "none" }}>
                                {settings.email}
                            </a>
                        )}
                        {settings.showPhone && settings.phone && (
                            <a href={`tel:${settings.phone}`} style={{ fontSize: "0.82rem", color: "#fff", opacity: 0.7, textDecoration: "none" }}>
                                {settings.phone}
                            </a>
                        )}
                        {storePages.map((page) => (
                            <Link
                                key={page.id}
                                to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)}
                                style={{ fontSize: "0.72rem", color: "#fff", opacity: 0.5, textDecoration: "none" }}
                            >
                                {page.title}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Copyright */}
                {settings.showCopyright && (
                    <p style={{ fontSize: "0.68rem", opacity: 0.4, marginTop: "2rem", letterSpacing: "0.1em" }}>
                        {settings.copyrightText?.replace("{year}", year) || `© ${year} ${brandName}`}
                    </p>
                )}
            </div>
        </footer>
    );
};

export default FooterCreative;
