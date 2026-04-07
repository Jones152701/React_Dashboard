import { useState, useEffect } from "react";
import api from "../config";

import Header from "../components/header/header";
import Navbar from "../components/navbar/navbar";
import Filters from "../components/lens-analytics-components/filters/Filters";
import type { DateFilterState } from "../components/lens-analytics-components/filters/Filters";

import ChartCard from "../components/Social_Media_Components/ChartCard/ChartCard";
import ChartRenderer from "../components/ChartRender";

import favicon from "../assets/images/favicon.ico";
import "../assets/css/LensFeedback.css";
import '../assets/css/LensFeedback.css'

/* ================= TYPES ================= */

interface ChartResponse {
    id: string;
    title: string;
    type: "bar" | "stackedbar";
    tooltip?: string;
    icon?: string;
    data: any[];
    config: any;
}

interface Comment {
    user: string;
    comment: string;
    bot_response: string;
    bot_response_html?: string;  // ✅ Added HTML version
    feedback_comment: string;
    date: string;
    type: "like" | "dislike";
}

interface ApiResponse {
    charts: ChartResponse[];
    users: string[];
    comments: Comment[];
    selected_user?: string;
}

/* ================= COMPONENT ================= */

const LensFeedback: React.FC = () => {

    /* 🔹 Default last 7 days */
    const getLast7Days = (): DateFilterState => {
        const today = new Date();
        const from = new Date();
        from.setDate(today.getDate() - 6);

        const format = (d: Date) => d.toISOString().split("T")[0];

        return {
            dateRange: "last_7",
            fromDate: format(from),
            toDate: format(today),
        };
    };

    /* ================= STATE ================= */

    const [filters, setFilters] = useState<DateFilterState>(getLast7Days());
    const [charts, setCharts] = useState<ChartResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>("");
    const [comments, setComments] = useState<Comment[]>([]);
    const [messageFilter, setMessageFilter] = useState<string>("all");
    const [selectedMessage, setSelectedMessage] = useState<Comment | null>(null);

    /* ================= FAVICON ================= */

    const setFavicon = (iconPath: string) => {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

        if (link) {
            link.href = iconPath;
        } else {
            const newLink = document.createElement("link");
            newLink.rel = "icon";
            newLink.href = iconPath;
            document.head.appendChild(newLink);
        }
    };

    useEffect(() => {
        document.title = "Lens Feedback";
        setFavicon(favicon);
    }, []);

    /* ================= SINGLE API CALL ================= */

    useEffect(() => {
        if (!filters.fromDate || !filters.toDate) return;

        const fetchFeedback = async () => {
            setLoading(true);

            try {
                console.log("📡 Fetching with filters:", filters);

                const response = await api.get<ApiResponse>(
                    "/LensOverview/LensFeedback",
                    {
                        params: {
                            from_date: filters.fromDate,
                            to_date: filters.toDate,
                            user: selectedUser || undefined
                        },
                    }
                );

                console.log("✅ API Response:", response.data);

                // Update all state from single API call
                setCharts(response.data?.charts || []);
                setUsers(response.data?.users || []);
                setComments(response.data?.comments || []);
                
                // ✅ Backend controls which user is selected
                setSelectedUser(response.data?.selected_user || "");

                // Reset filter when user changes
                setMessageFilter("all");

            } catch (error) {
                console.error("❌ API Error:", error);
                setCharts([]);
                setUsers([]);
                setComments([]);
                setSelectedUser("");
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [filters.fromDate, filters.toDate, selectedUser]);

    /* ================= CHART SEPARATION ================= */

    // Separate charts into two groups
    const totalFeedbackChart = charts.find(
        (c) => c.title === "Total Feedback Breakdown"
    );

    const userFeedbackChart = charts.find(
        (c) => c.title === "User Feedback Breakdown"
    );

    const otherCharts = charts.filter(
        (c) =>
            c.title !== "Total Feedback Breakdown" &&
            c.title !== "User Feedback Breakdown"
    );

    /* ================= MESSAGE FILTER LOGIC ================= */
    
    const filteredComments = comments.filter((comment) => {
        if (messageFilter === "all") return true;
        return comment.type === messageFilter;
    });

    const likeCount = comments.filter(c => c.type === "like").length;
    const dislikeCount = comments.filter(c => c.type === "dislike").length;

    /* ================= HANDLERS ================= */

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedUser(e.target.value);
    };

    const handleFiltersChange = (newFilters: DateFilterState) => {
        setFilters({ ...newFilters });
    };

    const handleMessageClick = (comment: Comment) => {
        setSelectedMessage(comment);
    };

    const handleCloseModal = () => {
        setSelectedMessage(null);
    };

    /* ================= UI ================= */

    return (
        <>
            <Header />
            <Navbar />

            <div className="pagewrap">

                {/* Filters */}
                <Filters onFiltersChange={handleFiltersChange} />

                <div className="chart-container">
                    {/* ================= ROW 1: TOP CHARTS ================= */}
                    <div className="row mb-4">
                        <div className="col-md-6">
                            {loading && !totalFeedbackChart ? (
                                <ChartCard
                                    title=""
                                    loading={true}
                                    skeletonType="bar"
                                >
                                    <></>
                                </ChartCard>
                            ) : totalFeedbackChart ? (
                                <ChartCard
                                    title={totalFeedbackChart.title}
                                    tooltip={totalFeedbackChart.tooltip}
                                    icon={totalFeedbackChart.icon}
                                    loading={loading}
                                    skeletonType={totalFeedbackChart.type === "stackedbar" ? "bar" : totalFeedbackChart.type}
                                >
                                    <ChartRenderer chart={totalFeedbackChart} />
                                </ChartCard>
                            ) : (
                                <div className="text-muted text-center p-4 border rounded">
                                    No data available
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            {loading && !userFeedbackChart ? (
                                <ChartCard
                                    title=""
                                    loading={true}
                                    skeletonType="bar"
                                >
                                    <></>
                                </ChartCard>
                            ) : userFeedbackChart ? (
                                <ChartCard
                                    title={userFeedbackChart.title}
                                    tooltip={userFeedbackChart.tooltip}
                                    icon={userFeedbackChart.icon}
                                    loading={loading}
                                    skeletonType={userFeedbackChart.type === "stackedbar" ? "bar" : userFeedbackChart.type}
                                >
                                    <ChartRenderer chart={userFeedbackChart} />
                                </ChartCard>
                            ) : (
                                <div className="text-muted text-center p-4 border rounded">
                                    No data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ================= ROW 2: DROPDOWN + PIE + MESSAGES ================= */}
                    <div className="row">

                        {/* LEFT COLUMN: Dropdown + Pie Chart */}
                        <div className="col-md-6">

                            {/* User Dropdown */}
                            <div className="mb-4">
                                <label className="form-label fw-semibold">
                                    <i className="bi bi-person me-2"></i>
                                    User Activity
                                </label>

                                <select
                                    className="form-select"
                                    value={selectedUser}
                                    onChange={handleUserChange}
                                    style={{ maxWidth: "300px" }}
                                >
                                    {users.map((user) => (
                                        <option key={user} value={user}>
                                            👤 {user}
                                        </option>
                                    ))}
                                </select>

                            </div>

                            {/* Pie Chart (always visible when user selected) */}
                            {selectedUser && (
                                <>
                                    {loading && otherCharts.length === 0 ? (
                                        <ChartCard
                                            title=""
                                            loading={true}
                                            skeletonType="bar"
                                        >
                                            <></>
                                        </ChartCard>
                                    ) : otherCharts.length > 0 ? (
                                        <div className="row">
                                            {otherCharts.map((chart, index) => (
                                                <div className="col-12" key={chart.id || index}>
                                                    <ChartCard
                                                        title={chart.title}
                                                        tooltip={chart.tooltip}
                                                        icon={chart.icon}
                                                        loading={loading}
                                                        skeletonType={chart.type === "stackedbar" ? "bar" : chart.type}
                                                    >
                                                        <ChartRenderer chart={chart} />
                                                    </ChartCard>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="alert alert-info">
                                            <i className="bi bi-info-circle me-2"></i>
                                            No additional charts available for this user
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Enhanced Messages Panel */}
                        <div className="col-md-6">
                            {selectedUser && (
                                <div className="card shadow-sm h-100">
                                    
                                    {/* HEADER with Filter */}
                                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Messages</strong>
                                            <div className="text-muted small">Click any message to view details</div>
                                        </div>

                                        {/* Filter Dropdown with counts */}
                                        <select
                                            className="form-select form-select-sm"
                                            style={{ width: "160px" }}
                                            value={messageFilter}
                                            onChange={(e) => setMessageFilter(e.target.value)}
                                        >
                                            <option value="all">All ({comments.length})</option>
                                            <option value="like">👍 Liked ({likeCount})</option>
                                            <option value="dislike">👎 Disliked ({dislikeCount})</option>
                                        </select>
                                    </div>

                                    {/* BODY with Messages List */}
                                    <div 
                                        className="card-body p-0 custom-scrollbar" 
                                        style={{ maxHeight: "550px", overflowY: "auto" }}
                                    >
                                        {loading ? (
                                            <div className="text-center text-muted p-5">
                                                <div className="spinner-border text-primary me-2" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                                <div className="mt-2 text-primary fw-medium">Fetching feedback...</div>
                                            </div>
                                        ) : filteredComments.length === 0 ? (
                                            <div className="text-center text-muted p-5">
                                                <div className="mb-3">
                                                    <i className="bi bi-chat-square-text fs-1 opacity-25"></i>
                                                </div>
                                                <p className="mt-2 mb-0 fw-medium">No messages found for this user</p>
                                                <small>Try selecting a different user or date range</small>
                                            </div>
                                        ) : (
                                            filteredComments.map((comment, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`message-card ${selectedMessage === comment ? 'selected' : ''} ${comment.type === "like" ? "badge-like" : "badge-dislike"}`}
                                                    style={{ '--item-index': idx } as React.CSSProperties}
                                                    onClick={() => handleMessageClick(comment)}
                                                >
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <div className="date-badge fw-bold">
                                                            <i className="bi bi-clock-history"></i>
                                                            {comment.date || "Just now"}
                                                        </div>
                                                        <span className={`msg-type-badge ${comment.type === "like" ? "badge-like" : "badge-dislike"}`}>
                                                            {comment.type === "like" ? <i className="bi bi-hand-thumbs-up-fill me-1"></i> : <i className="bi bi-hand-thumbs-down-fill me-1"></i>}
                                                            {comment.type === "like" ? "Liked" : "Disliked"}
                                                        </span>
                                                    </div>

                                                    <div className="msg-content mb-2">
                                                        {comment.comment}
                                                    </div>

                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-light px-2 py-1 rounded small text-muted border">
                                                            <i className="bi bi-person-fill me-1"></i>
                                                            {comment.user}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Footer with count */}
                                    {!loading && filteredComments.length > 0 && (
                                        <div className="card-footer bg-white text-muted small border-top py-3">
                                            <div className="d-flex justify-content-between">
                                                <span><i className="bi bi-list-check me-1"></i> Total: {comments.length}</span>
                                                <span>Showing {filteredComments.length} messages</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Global no data state */}
                    {!loading && charts.length === 0 && (
                        <div className="row mt-3">
                            <div className="col-12">
                                <div className="alert alert-warning">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    No data available for the selected filters. Please try different dates.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* ================= MODAL ================= */}
            {selectedMessage && (
                <>
                    {/* Modal Backdrop */}
                    <div className="modal-backdrop fade show"></div>
                    
                    {/* Modal */}
                    <div className="modal fade show d-block lens-modal" tabIndex={-1}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content">

                                {/* HEADER */}
                                <div className="modal-header d-flex justify-content-between align-items-center">
                                    <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                                        <span className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
                                            <i className="bi bi-chat-left-text-fill text-primary"></i>
                                        </span>
                                        Feedback Analysis
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close shadow-none" 
                                        onClick={handleCloseModal}
                                    ></button>
                                </div>

                                {/* BODY */}
                                <div className="modal-body custom-scrollbar" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                                    
                                    <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                                        <div className="d-flex gap-4">
                                            <div>
                                                <div className="text-muted small mb-1">User</div>
                                                <div className="fw-bold">{selectedMessage.user}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted small mb-1">Timestamp</div>
                                                <div className="fw-bold text-dark">{selectedMessage.date}</div>
                                            </div>
                                        </div>
                                        <span className={`badge fs-6 px-3 py-2 rounded-pill ${selectedMessage.type === "like" ? "badge-like" : "badge-dislike"}`}>
                                            {selectedMessage.type === "like" ? "👍 Great Experience" : "👎 Issues Reported"}
                                        </span>
                                    </div>

                                    <div className="conversation-box">
                                        {/* USER QUESTION */}
                                        <div className="chat-bubble bubble-user">
                                            <div className="bubble-label">
                                                <i className="bi bi-person-fill"></i> User Question
                                            </div>
                                            <div className="fw-medium">
                                                {selectedMessage.comment}
                                            </div>
                                        </div>

                                        {/* BOT RESPONSE - ✅ WITH HTML RENDERING */}
                                        <div className="chat-bubble bubble-bot">
                                            <div className="bubble-label text-primary">
                                                <i className="bi bi-robot"></i> Assistant Response
                                            </div>
                                            <div 
                                                className="markdown-content"
                                                style={{ 
                                                    whiteSpace: "normal",
                                                    wordWrap: "break-word"
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html: selectedMessage.bot_response_html || selectedMessage.bot_response || "No automated response captured."
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* FEEDBACK COMMENT */}
                                    {selectedMessage.feedback_comment && (
                                        <div className="feedback-section mt-4">
                                            <div className="bubble-label text-success">
                                                <i className="bi bi-chat-quote-fill"></i> User Feedback Note
                                            </div>
                                            <div className="fst-italic text-secondary">
                                                "{selectedMessage.feedback_comment}"
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* FOOTER */}
                                <div className="modal-footer border-0 p-3">
                                    <button 
                                        type="button" 
                                        className="btn btn-light px-4 fw-semibold" 
                                        onClick={handleCloseModal}
                                    >
                                        Dismiss
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </>
            )}

        </>
    );
};

export default LensFeedback;