import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/header/header";
import Navbar from "../components/navbar/navbar";
import MatrixCarousel from "../components/competitors-components/matrix-carousel/MatrixCarousel";
import CountryFlag from "../components/competitors-components/country-flag/CountryFlag";
import { getCompetitorLogo } from "../types/getCompetitorLogo";
import '../assets/css/CompetitorDetail.css';
import api from "../config";

// ================= TYPES =================
type Plan = {
    plans_html: string;
};

type Tier = {
    tier: string;
    matrix_html: string;
};

type CompetitorData = {
    meta: {
        name: string;
        country: string;
        type: string;
        date: string;
    };
    plans: Plan[];
    tiers: Tier[];
};

type LocationState = {
    name: string;
    type: string;
    country: string;
} | null;

// ================= HELPERS =================
const toTitleCase = (str: string) =>
    str.replace(/\b\w/g, (c) => c.toUpperCase());

const getTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t === "mno") return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    if (t === "mvno") return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
    return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" };
};

// ================= SKELETON =================
const SkeletonLoader = () => (
    <div className="cd-skeleton">
        <div className="cd-skeleton-hero" />
        <div className="cd-skeleton-section">
            <div className="cd-skeleton-bar cd-skeleton-title" />
            <div className="cd-skeleton-bar" />
            <div className="cd-skeleton-bar cd-skeleton-short" />
        </div>
        <div className="cd-skeleton-section">
            <div className="cd-skeleton-bar cd-skeleton-title" />
            <div className="cd-skeleton-bar" />
            <div className="cd-skeleton-bar" />
            <div className="cd-skeleton-bar cd-skeleton-short" />
        </div>
    </div>
);

// ================= COMPONENT =================
const CompetitorDetail = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const stateData = location.state as LocationState;

    const [data, setData] = useState<CompetitorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"plans" | "tiers">("plans");
    const [imgError, setImgError] = useState(false);

    const decodeSlug = (slug: string) => {
        const parts = slug.split("__");
        if (parts.length !== 3) return null;
        const [name, type, country] = parts;
        return { name: name.replace(/-/g, " "), type, country: country.replace(/-/g, " ") };
    };

    useEffect(() => {
        if (!slug && !stateData) {
            setError("No competitor specified");
            setLoading(false);
            return;
        }

        let name: string, type: string, country: string;

        if (stateData) {
            ({ name, type, country } = stateData);
        } else {
            const decoded = decodeSlug(slug!);
            if (!decoded) {
                setError("Invalid competitor URL format");
                setLoading(false);
                return;
            }
            ({ name, type, country } = decoded);
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/competitor-detail", {
                    params: { name, type, country },
                });
                setData(data);
            } catch (error: any) {
                console.error("Error fetching competitor data:", error);
                setError(error?.response?.data?.detail || error.message || "Failed to load");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, stateData]);

    const handleBack = () => navigate("/competitors-plan");

    // Build MatrixCarousel slides from tiers
    const tierSlides = (data?.tiers ?? []).map((t) => ({
        tier: t.tier,
        html: t.matrix_html,
    }));

    // ── Error state ──
    if (error) {
        return (
            <>
                <Header />
                <Navbar />
                <div className="pagewrap analyticscontent">
                    <div className="cd-error-state">
                        <div className="cd-error-icon">⚠️</div>
                        <h3>Failed to load competitor</h3>
                        <p>{error}</p>
                        <button onClick={handleBack} className="cd-back-btn">
                            <i className="bi bi-arrow-left" /> Back to Competitors
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <Navbar />

            <div className="pagewrap analyticscontent">

                {/* ── Loading ── */}
                {loading && <SkeletonLoader />}

                {/* ── Content ── */}
                {!loading && data && (
                    <div className="cd-content">

                        {/* ══════════ HERO CARD ══════════ */}
                        <div className="cd-hero">
                            <div className="cd-hero-glow" />

                            <div className="cd-hero-avatar">
                                {getCompetitorLogo(data.meta.name) && !imgError ? (
                                    <img 
                                        src={getCompetitorLogo(data.meta.name)!} 
                                        alt={data.meta.name} 
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    data.meta.name.charAt(0).toUpperCase()
                                )}
                            </div>

                            <div className="cd-hero-info">
                                <h1 className="cd-hero-name">{toTitleCase(data.meta.name)}</h1>

                                <div className="cd-hero-badges">
                                    {/* Country */}
                                    <span className="cd-badge cd-badge-country">
                                        <CountryFlag country={data.meta.country} width={20} height={15} />
                                        {toTitleCase(data.meta.country)}
                                    </span>

                                    {/* Type */}
                                    {(() => {
                                        const { bg, color, border } = getTypeColor(data.meta.type);
                                        return (
                                            <span
                                                className="cd-badge"
                                                style={{ background: bg, color, border: `1.5px solid ${border}` }}
                                            >
                                                <i className="bi bi-building" />
                                                {data.meta.type.toUpperCase()}
                                            </span>
                                        );
                                    })()}

                                    {/* Date */}
                                    <span className="cd-badge cd-badge-date">
                                        <i className="bi bi-calendar3" />
                                        Latest: {data.meta.date?.split("T")[0] || "N/A"}
                                    </span>
                                </div>
                            </div>

                            {/* Right side container: Button + Stats */}
                            <div className="cd-hero-right">
                                <button onClick={handleBack} className="cd-back-btn-hero">
                                    <i className="bi bi-arrow-left" /> Back to Competitors
                                </button>

                                {/* Stats strip */}
                                <div className="cd-hero-stats">
                                    {/* Make sure we also display plans count cleanly if available! */}
                                    {data.plans && (
                                        <>
                                            <div className="cd-stat">
                                                <span className="cd-stat-value">{data.plans.length}</span>
                                                <span className="cd-stat-label">Plans</span>
                                            </div>
                                            <div className="cd-stat-divider" />
                                        </>
                                    )}
                                    <div className="cd-stat">
                                        <span className="cd-stat-value">{data.tiers?.length ?? 0}</span>
                                        <span className="cd-stat-label">Tier Plans</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══════════ MAIN TABS ══════════ */}
                        <div className="cd-tabs-container">
                            <div className="cd-page-tabs">
                                <button
                                    className={`cd-page-tab tab-plans ${activeTab === "plans" ? "active" : ""}`}
                                    onClick={() => setActiveTab("plans")}
                                >
                                    <i className="bi bi-grid-3x3-gap-fill" />
                                    Plans
                                </button>
                                <button
                                    className={`cd-page-tab tab-tiers ${activeTab === "tiers" ? "active" : ""}`}
                                    onClick={() => setActiveTab("tiers")}
                                >
                                    <i className="bi bi-bar-chart-steps" />
                                    Tier Analysis
                                </button>
                            </div>
                        </div>

                        {/* ══════════ PLANS SECTION ══════════ */}
                        {activeTab === "plans" && (
                            <div className="cd-section">
                                <div className="cd-section-header">
                                    <div className="cd-section-icon cd-icon-plans">
                                        <i className="bi bi-grid-3x3-gap-fill" />
                                    </div>
                                    <div>
                                        <h2 className="cd-section-title">Plans</h2>
                                        <p className="cd-section-sub">Available subscription plans</p>
                                    </div>
                                </div>

                                {(!data.plans || data.plans.length === 0) ? (
                                    <div className="cd-empty">
                                        <i className="bi bi-inbox" />
                                        <span>No plans available</span>
                                    </div>
                                ) : (
                                    <div className="cd-plans-grid">
                                        {data.plans.map((plan: Plan, idx: number) => (
                                            <div
                                                key={idx}
                                                className="cd-plan-card"
                                                style={{ animationDelay: `${idx * 80}ms` }}
                                            >
                                                <div className="plan-html" dangerouslySetInnerHTML={{ __html: plan.plans_html }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════ TIER ANALYSIS ══════════ */}
                        {activeTab === "tiers" && (
                            <div className="cd-section">
                                <div className="cd-section-header">
                                    <div className="cd-section-icon cd-icon-tiers">
                                        <i className="bi bi-bar-chart-steps" />
                                    </div>
                                    <div>
                                        <h2 className="cd-section-title">Tier Analysis</h2>
                                        <p className="cd-section-sub">Comparative matrix by plan tier</p>
                                    </div>
                                </div>

                                {tierSlides.length === 0 ? (
                                    <div className="cd-empty">
                                        <i className="bi bi-inbox" />
                                        <span>No tier data available</span>
                                    </div>
                                ) : (
                                    <MatrixCarousel slides={tierSlides} />
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </>
    );
};

export default CompetitorDetail;