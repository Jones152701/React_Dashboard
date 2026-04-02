import { useParams } from "react-router-dom";
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

// ================= COMPONENT =================

const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

const CompetitorDetail = () => {
    const { slug } = useParams();
    const [data, setData] = useState<CompetitorData | null>(null);

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
        if (!slug) return;

        const decoded = decodeSlug(slug);

        if (!decoded) {
            console.error("Invalid slug:", slug);
            return;
        }

        const { name, type, country } = decoded;

        fetch(
            `http://localhost:8000/competitor-detail?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&country=${encodeURIComponent(country)}`
        )
            .then((res) => {
                if (!res.ok) throw new Error("API failed");
                return res.json();
            })
            .then(setData)
            .catch((error) => {
                console.error("Error fetching competitor data:", error);
                setData(null);
            });

    }, [slug]);

    return (
        <>
            <Header />
            <Navbar />

            <div className="pagewrap analyticscontent">
                {/* 🔹 Loading */}
                {!data && <p>Loading...</p>}

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
                                Latest Data: {data.meta.date.split("T")[0]}
                            </small>
                        </div>

                        {/* ================= PLANS ================= */}
                        <div className="competitor-section">
                            <h4>Plans</h4>

                            {data.plans?.length === 0 && <p>No plans available</p>}

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

                            {data.tiers?.length === 0 && <p>No tier data available</p>}

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