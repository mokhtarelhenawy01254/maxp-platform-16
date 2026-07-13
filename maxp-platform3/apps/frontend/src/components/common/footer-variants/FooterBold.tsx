/**
 * FooterBold — Sport / Tech / Conversion-Focused Footer
 * Pure presentation component.
 */
import React from "react";
import { Link } from "react-router-dom";
import { FooterSettings } from "../../../services/footerSettingsService";
import { withStorefrontCompany } from "../../../utils/storefrontLinks";

interface FooterBoldProps {
    companyId: string | null;
    settings: FooterSettings;
    storePages: Array<{ id: string; title: string; slug: string }>;
    newsletterEmail: string;
    newsletterStatus: "idle" | "loading" | "success" | "error";
    onNewsletterEmailChange: (email: string) => void;
    onNewsletterSubmit: (e: React.FormEvent) => void;
}

const FooterBold: React.FC<FooterBoldProps> = ({
    companyId,
    settings,
    storePages,
    newsletterEmail,
    newsletterStatus,
    onNewsletterEmailChange,
    onNewsletterSubmit,
}) => {
    const year = new Date().getFullYear().toString();
    const brandName = settings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() || "المتجر";
    const coreLinks = [
        { label: "المنتجات", path: "/shop" },
        { label: "السلة", path: "/shop/cart" },
        { label: "تتبع طلبك", path: "/shop/track-order" },
        { label: "الأسئلة الشائعة", path: "/faq" },
        { label: "تواصل معنا", path: "/contact" },
    ];

    const sectionTitle = (text: string) => (
        <h4 style={{
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            fontWeight: 800,
            color: "var(--theme-accent, #FF4D2D)",
            marginBottom: "1.2rem",
            margin: "0 0 1.2rem",
        }}>
            {text}
        </h4>
    );

    return (
        <footer
            style={{
                background: "var(--theme-primary, #0B1220)",
                color: "var(--theme-color-text, #F8FAFC)",
                padding: "4rem 0 0",
                marginTop: "auto",
                borderTop: "3px solid var(--theme-accent, #FF4D2D)",
            }}
        >
            <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 2rem" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "3rem",
                        marginBottom: "3rem",
                    }}
                >
                    {/* Brand */}
                    {settings.showAboutStore && (
                        <div>
                            {sectionTitle(brandName)}
                            <p style={{ fontSize: "0.82rem", lineHeight: 1.8, opacity: 0.65, margin: 0 }}>
                                {settings.aboutStore}
                            </p>
                        </div>
                    )}

                    {/* Store Links */}
                    {settings.showQuickLinks && (
                        <div>
                            {sectionTitle("روابط سريعة")}
                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                                {coreLinks.map((item) => (
                                    <li key={item.label}>
                                        <Link
                                            to={withStorefrontCompany(item.path, companyId)}
                                            style={{
                                                fontSize: "0.8rem",
                                                opacity: 0.65,
                                                textDecoration: "none",
                                                color: "inherit",
                                                transition: "opacity 0.2s, color 0.2s",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.4rem",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.opacity = "1";
                                                e.currentTarget.style.color = "var(--theme-accent, #FF4D2D)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.opacity = "0.65";
                                                e.currentTarget.style.color = "inherit";
                                            }}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Contact */}
                    <div>
                        {sectionTitle("تواصل معنا")}
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                            {settings.showEmail && settings.email && (
                                <li>
                                    <a href={`mailto:${settings.email}`} style={{ fontSize: "0.8rem", opacity: 0.65, textDecoration: "none", color: "inherit" }}>
                                        📧 {settings.email}
                                    </a>
                                </li>
                            )}
                            {settings.showPhone && settings.phone && (
                                <li>
                                    <a href={`tel:${settings.phone}`} style={{ fontSize: "0.8rem", opacity: 0.65, textDecoration: "none", color: "inherit" }}>
                                        📱 {settings.phone}
                                    </a>
                                </li>
                            )}
                            {settings.showAddress && settings.address && (
                                <li style={{ fontSize: "0.8rem", opacity: 0.65 }}>📍 {settings.address}</li>
                            )}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        {sectionTitle("النشرة البريدية")}
                        <p style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: "1rem", lineHeight: 1.7 }}>
                            انضم وكن أول من يعرف عروضنا الحصرية
                        </p>
                        {newsletterStatus === "success" ? (
                            <p style={{ color: "var(--theme-accent, #FF4D2D)", fontSize: "0.85rem", fontWeight: 700 }}>
                                ✓ تم التسجيل بنجاح!
                            </p>
                        ) : (
                            <form onSubmit={onNewsletterSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                <input
                                    type="email"
                                    required
                                    value={newsletterEmail}
                                    onChange={(e) => onNewsletterEmailChange(e.target.value)}
                                    placeholder="بريدك الإلكتروني"
                                    style={{
                                        background: "rgba(255,255,255,0.07)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        borderRadius: "6px",
                                        padding: "0.7rem 1rem",
                                        color: "inherit",
                                        fontSize: "0.82rem",
                                        outline: "none",
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={newsletterStatus === "loading"}
                                    style={{
                                        background: "var(--theme-accent, #FF4D2D)",
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "0.7rem 1rem",
                                        color: "#fff",
                                        fontWeight: 800,
                                        fontSize: "0.78rem",
                                        letterSpacing: "0.1em",
                                        cursor: "pointer",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {newsletterStatus === "loading" ? "..." : "اشتراك الآن"}
                                </button>
                            </form>
                        )}
                        {newsletterStatus === "error" && (
                            <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#FCA5A5" }}>
                                تعذر الاشتراك الآن. حاول مرة أخرى.
                            </p>
                        )}
                    </div>
                </div>

                {/* Bottom bar */}
                <div
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        padding: "1.5rem 0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "1rem",
                    }}
                >
                    {settings.showCopyright && (
                        <p style={{ fontSize: "0.72rem", opacity: 0.4, margin: 0, letterSpacing: "0.05em" }}>
                            {settings.copyrightText?.replace("{year}", year) || `© ${year} المتجر.`}
                        </p>
                    )}
                    <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                        {storePages.slice(0, 4).map((page) => (
                            <Link
                                key={page.id}
                                to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)}
                                style={{ fontSize: "0.68rem", opacity: 0.4, textDecoration: "none", color: "inherit" }}
                            >
                                {page.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default FooterBold;
