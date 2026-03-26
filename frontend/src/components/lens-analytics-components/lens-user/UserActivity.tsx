import React, { useEffect, useRef, useState, useMemo } from "react";
import ChartCard from "../../Social_Media_Components/ChartCard/ChartCard";
import ChartRenderer from "../../ChartRender";
import AnimatedList from "../../component/AnimatedList";

/* ================= TYPES ================= */

interface ChartResponse {
    id: string;
    title: string;
    type: "bar" | "pie" | "area" | "treemap";
    tooltip?: string;
    icon?: string;
    data: any[];
    config: any;
}

interface Message {
    date?: string;
    message?: string;
    text?: string;
    [key: string]: any;
}

interface UserActivityProps {
    users: string[];
    selectedUser: string;
    onUserChange: (user: string) => void;
    userDailyChart?: ChartResponse;
    messages: Message[];
    loading?: boolean;
    className?: string;
}

const EXTRA_HEIGHT = 110; // tweak as needed

/* ================= COMPONENT ================= */

const UserActivity: React.FC<UserActivityProps> = ({
    users,
    selectedUser,
    onUserChange,
    userDailyChart,
    messages,
    loading = false,
    className = "",
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartHeight, setChartHeight] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* ================= HELPER FUNCTIONS ================= */

    const formatDate = (dateString?: string): string => {
        if (!dateString) return "Date not available";

        try {
            const date = new Date(dateString);

            return date.toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
        } catch {
            return "Invalid date";
        }
    };

    const getMessageContent = (msg: Message): string => {
        return msg.message || msg.text || "No message content";
    };

    /* ================= TRANSFORM MESSAGES FOR ANIMATED LIST ================= */
    // ✅ Using useMemo for performance optimization
    const animatedItems = useMemo(() =>
        messages.map((msg, idx) => (
            <div key={idx}>
                <div
                    className="small text-muted mb-2"
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                    <i className="far fa-calendar-alt"></i>
                    {formatDate(msg.date)}
                </div>
                <div
                    style={{
                        wordBreak: "break-word",
                        lineHeight: "1.5",
                        color: "#2c3e50",
                    }}
                >
                    {getMessageContent(msg)}
                </div>
            </div>
        )),
        [messages] // Re-compute only when messages change
    );

    /* ================= FILTERED USERS ================= */
    const filteredUsers = useMemo(() =>
        users.filter(user =>
            user.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [users, searchTerm]
    );

    /* ================= HANDLE USER SELECTION ================= */
    const handleUserSelect = (user: string) => {
        onUserChange(user);
        setSearchTerm(user);
        setIsDropdownOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setIsDropdownOpen(true);

        if (value !== "") {
            const exactMatch = users.find(user => user.toLowerCase() === value.toLowerCase());
            if (exactMatch && exactMatch !== selectedUser) {
                onUserChange(exactMatch);
            }
        }
    };

    /* ================= CLICK OUTSIDE TO CLOSE DROPDOWN ================= */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    /* ================= SYNC SEARCH TERM WITH SELECTED USER ================= */
    useEffect(() => {
        if (selectedUser) {
            setSearchTerm(selectedUser);
        }
    }, [selectedUser]);

    /* ================= EFFECT TO SYNC HEIGHTS ================= */
    useEffect(() => {
        if (chartContainerRef.current && selectedUser) {
            const updateHeight = () => {
                const height = chartContainerRef.current?.clientHeight;
                if (height) {
                    setChartHeight(height);
                }
            };

            updateHeight();

            const resizeObserver = new ResizeObserver(updateHeight);
            if (chartContainerRef.current) {
                resizeObserver.observe(chartContainerRef.current);
            }

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [selectedUser, userDailyChart, loading]);

    /* ================= HANDLE MESSAGE SELECT ================= */
    const handleMessageSelect = (item: React.ReactNode, index: number) => {
        console.log("Selected message:", item, "at index:", index);
        // Add your custom logic here (e.g., open modal, highlight message, etc.)
    };

    /* ================= RENDER ================= */

    return (
        <div className={`user-activity-section ${className}`}>
            {users.length > 0 && (
                <div className="card p-4 mb-4 unified-card">
                    <div className="row g-4">
                        {/* ================= LEFT SIDE ================= */}
                        <div className="col-lg-6">
                            {/* 🔷 TITLE */}
                            <div className="d-flex align-items-center mb-3">
                                <i className="fas fa-users me-2" style={{ color: "#7B61FF", fontSize: "1.3rem" }}></i>
                                <h5 className="mb-0 chart-title">User Activity Details</h5>
                                <div className="info-tooltip">
                                    <i className="bi bi-info-circle-fill info-icon ms-2"></i>
                                    <div className="tooltip-box">
                                        Select a user to view their daily activity and message history
                                    </div>
                                </div>
                            </div>

                            {/* 🔍 DROPDOWN */}
                            <div ref={dropdownRef} style={{ position: "relative", marginBottom: "16px" }}>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search or select a user..."
                                        value={searchTerm}
                                        onChange={handleInputChange}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        disabled={loading}
                                        style={{
                                            paddingRight: "30px",
                                            cursor: loading ? "not-allowed" : "pointer",
                                            borderRadius: "10px"
                                        }}
                                    />
                                    <i
                                        className="fas fa-chevron-down"
                                        style={{
                                            position: "absolute",
                                            right: "10px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            color: "#6c757d",
                                            fontSize: "12px",
                                            pointerEvents: "none"
                                        }}
                                    ></i>
                                </div>

                                {isDropdownOpen && !loading && (
                                    <div
                                        className="dropdown-menu show"
                                        style={{
                                            width: "100%",
                                            maxHeight: "250px",
                                            overflowY: "auto",
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            zIndex: 1000,
                                            marginTop: "5px",
                                            borderRadius: "8px"
                                        }}
                                    >
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user, index) => (
                                                <button
                                                    key={index}
                                                    className={`dropdown-item ${selectedUser === user ? "active" : ""}`}
                                                    onClick={() => handleUserSelect(user)}
                                                    style={{
                                                        cursor: "pointer",
                                                        backgroundColor: selectedUser === user ? "#7B61FF" : "transparent",
                                                        color: selectedUser === user ? "white" : "inherit",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px"
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (selectedUser !== user) {
                                                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedUser !== user) {
                                                            e.currentTarget.style.backgroundColor = "transparent";
                                                        }
                                                    }}
                                                >
                                                    <i className="fas fa-user-circle" style={{ fontSize: "14px" }}></i>
                                                    <span style={{ flex: 1 }}>{user}</span>
                                                    {selectedUser === user && (
                                                        <i className="fas fa-check" style={{ fontSize: "12px" }}></i>
                                                    )}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="dropdown-item text-muted" style={{ cursor: "default" }}>
                                                <i className="fas fa-search me-2"></i>
                                                No users found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 📊 CHART */}
                            <div ref={chartContainerRef}>
                                {selectedUser ? (
                                    userDailyChart ? (
                                        <ChartCard
                                            title={`Daily Activity Trend of ${selectedUser}`}
                                            loading={loading}
                                        >
                                            <ChartRenderer chart={userDailyChart} />
                                        </ChartCard>
                                    ) : (
                                        <div className="text-center text-muted py-5" style={{ border: "1px solid #eee", borderRadius: "12px", backgroundColor: "#fafbfc" }}>
                                            <i className="fas fa-chart-line mb-3" style={{ fontSize: "3rem", opacity: 0.5 }}></i>
                                            <p>No chart data available</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center text-muted py-5" style={{ border: "1px solid #eee", borderRadius: "12px", backgroundColor: "#fafbfc" }}>
                                        <i className="fas fa-user-circle mb-3" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                                        <p>Select a user to view activity chart</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ================= RIGHT SIDE ================= */}
                        <div className="col-lg-6">
                            <div
                                className="h-100 d-flex flex-column"
                                style={{
                                    border: "1px solid #e9ecef",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    backgroundColor: "#fff",
                                    height: "100%",
                                    maxHeight: chartHeight > 0
                                        ? `${chartHeight + EXTRA_HEIGHT}px`
                                        : "600px"
                                }}
                            >
                                {/* HEADER */}
                                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                    <strong className="h6 mb-0">
                                        <i className="fas fa-comment-dots me-2" style={{ color: "#7B61FF" }}></i>
                                        Recent Messages
                                    </strong>
                                    {selectedUser && (
                                        <span className="badge" style={{ backgroundColor: "#7B61FF", color: "white" }}>
                                            {messages.length} {messages.length === 1 ? "message" : "messages"}
                                        </span>
                                    )}
                                </div>

                                {/* CONTENT - Using AnimatedList */}
                                {loading ? (
                                    <div className="text-center py-5 flex-grow-1 d-flex flex-column justify-content-center">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2 text-muted">Loading messages...</p>
                                    </div>
                                ) : (
                                    <div style={{ height: "100%", overflow: "hidden", flex: 1, minHeight: 0 }}>
                                        {selectedUser ? (
                                            messages.length > 0 ? (
                                                <AnimatedList
                                                    items={animatedItems}
                                                    onItemSelect={handleMessageSelect}
                                                    showGradients={false}
                                                    enableArrowNavigation={true}
                                                    displayScrollbar
                                                    className="messages-animated-list"
                                                    itemClassName="message-item-wrapper"
                                                />
                                            ) : (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="far fa-comment-dots mb-3" style={{ fontSize: "3rem", opacity: 0.5 }}></i>
                                                    <p>No messages found for this user</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="text-center py-5 text-muted">
                                                <i className="fas fa-user-circle mb-3" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                                                <p>Select a user to view messages</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state when no users available */}
            {users.length === 0 && (
                <div className="card p-5 text-center text-muted bg-light">
                    <i className="fas fa-users mb-3" style={{ fontSize: "4rem", opacity: 0.3 }}></i>
                    <h5>No users available</h5>
                    <p className="mb-0">No user data found for the selected date range</p>
                </div>
            )}
        </div>
    );
};

export default UserActivity;