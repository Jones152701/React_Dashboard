import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/header/header";
import Navbar from "../components/navbar/navbar";
import '../assets/css/CompetitorDetail.css'

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

// ================= COMPONENT =================

const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

const CompetitorDetail = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // ✅ Moved INSIDE the component - after useLocation()
    const stateData = location.state as LocationState;
    
    const [data, setData] = useState<CompetitorData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const decodeSlug = (slug: string) => {
        const parts = slug.split("__");

        if (parts.length !== 3) return null;

        const [name, type, country] = parts;

        return {
            name: name.replace(/-/g, " "),
            type,
            country: country.replace(/-/g, " "),
        };
    };

    useEffect(() => {
        if (!slug && !stateData) {
            setError("No competitor specified");
            return;
        }

        let name: string;
        let type: string;
        let country: string;

        // ✅ USE STATE FIRST (REAL DATA)
        if (stateData) {
            ({ name, type, country } = stateData);
        } else {
            // fallback (less reliable)
            const decoded = decodeSlug(slug!);
            if (!decoded) {
                setError("Invalid competitor URL format");
                return;
            }
            ({ name, type, country } = decoded);
        }

        fetch(
            `http://localhost:8000/competitor-detail?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&country=${encodeURIComponent(country)}`
        )
            .then((res) => {
                if (!res.ok) throw new Error(`API failed with status ${res.status}`);
                return res.json();
            })
            .then(setData)
            .catch((error) => {
                console.error("Error fetching competitor data:", error);
                setError(error.message);
                setData(null);
            });

    }, [slug, stateData]);

    // Handle back navigation with filters
    const handleBack = () => {
        const returnFilters = sessionStorage.getItem('returnFilters');
        if (returnFilters) {
            navigate(`/competitors?${returnFilters}`);
        } else {
            navigate('/competitors');
        }
    };

    if (error) {
        return (
            <>
                <Header />
                <Navbar />
                <div className="pagewrap analyticscontent">
                    <div className="error-state">
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: 48, color: '#dc3545' }}></i>
                        <h3>Error loading competitor data</h3>
                        <p>{error}</p>
                        <button onClick={handleBack} className="back-button">
                            <i className="bi bi-arrow-left"></i> Back to Competitors
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
                {/* Back button */}
                <button onClick={handleBack} className="back-button">
                    <i className="bi bi-arrow-left"></i> Back
                </button>

                {/* 🔹 Loading */}
                {!data && (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading competitor data...</p>
                    </div>
                )}

                {/* 🔹 Content */}
                {data && (
                    <>
                        {/* ================= META ================= */}
                        <div className="competitor-header">
                            <h2>{toTitleCase(data.meta.name)}</h2>
                            <p>
                                {toTitleCase(data.meta.country)} • {data.meta.type.toUpperCase()}
                            </p>
                            <small>
                                Latest Data: {data.meta.date?.split("T")[0] || 'N/A'}
                            </small>
                        </div>

                        {/* ================= PLANS ================= */}
                        <div className="competitor-section">
                            <h4>Plans</h4>

                            {(!data.plans || data.plans?.length === 0) && <p>No plans available</p>}

                            {data.plans?.map((plan: Plan, idx: number) => (
                                <div key={idx} className="plan-card">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: plan.plans_html,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* ================= TIERS ================= */}
                        <div className="competitor-section">
                            <h4>Tier Analysis</h4>

                            {(!data.tiers || data.tiers?.length === 0) && <p>No tier data available</p>}

                            {data.tiers?.map((tier: Tier, idx: number) => (
                                <div key={idx} className="tier-card">
                                    <h5>{tier.tier}</h5>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: tier.matrix_html,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default CompetitorDetail;