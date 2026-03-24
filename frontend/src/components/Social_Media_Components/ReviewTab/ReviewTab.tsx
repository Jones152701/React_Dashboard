import React, { useEffect, useState } from "react";
import "./ReviewTab.css";
import type { FilterState } from "../subheader/subheader";
import postive from '../../../assets/images/positive.png';
import negative from '../../../assets/images/negative.png';
import neutral from '../../../assets/images/neutral.png';

interface Review {
  username: string;
  platform: string;
  message: string;
  sentiment: string;
  rating: number;
  country: string;
  created_date: string;
  link?: string;
}

interface Props {
  filters: FilterState | null;
}

const ReviewTab: React.FC<Props> = ({ filters }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  
  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Fetch reviews when filters, page, or search changes
  useEffect(() => {
    if (!filters) return;
    
    // Ensure we have valid dates
    if (!filters.fromDate || !filters.toDate) {
      console.warn("Missing dates in filters");
      return;
    }

    const fetchReviews = async () => {
      setLoading(true);
      setIsSearching(true);

      try {
        const params = new URLSearchParams();

        // Explicitly mark this as a reviews request
        params.append("type", "reviews");
        
        params.append("from_date", filters.fromDate);
        params.append("to_date", filters.toDate);
        params.append("page", String(page));

        // Only add filters if they're not "all"
        if (filters.countries && !filters.countries.includes("all")) {
          params.append("countries", filters.countries.join(","));
        }

        if (filters.platforms && !filters.platforms.includes("all")) {
          params.append("platforms", filters.platforms.join(","));
        }

        if (filters.sentiments && !filters.sentiments.includes("all")) {
          params.append("sentiments", filters.sentiments.join(","));
        }

        // Add search if exists
        if (debouncedSearch.trim()) {
          params.append("search", debouncedSearch.trim());
        }

        // DEBUG: Log the URL
        const url = `http://localhost:8000/social_media/?${params.toString()}`;
        console.log("Fetching reviews:", url);

        const response = await fetch(url);
        const result = await response.json();
        
        console.log("Reviews response:", result);
        
        setReviews(result.reviews || []);
        setTotalPages(result.total_pages || 0);
        setTotalReviews(result.total_reviews || 0);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    };

    fetchReviews();
  }, [filters, page, debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Highlight text function with regex escaping
  const highlightText = (text: string, keyword: string) => {
    if (!keyword || !text) return text;

    // Escape special regex characters
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");

    return text.replace(regex, "<mark>$1</mark>");
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const sentimentEmoji = (sentiment?: string) => {
    if (sentiment === "positive") return <img src={postive} width={50} height={50} alt="positive" />;
    if (sentiment === "negative") return <img src={negative} width={50} height={50} alt="negative" />;
    return <img src={neutral} width={50} height={50} alt="neutral" />;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  // Pagination render function
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let pages = [];
    const maxVisible = 5;

    pages.push(1);

    let startPage = Math.max(2, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages - 1, page + Math.floor(maxVisible / 2));

    if (page - 1 < Math.floor(maxVisible / 2)) {
      endPage = Math.min(totalPages - 1, maxVisible);
    }

    if (totalPages - page < Math.floor(maxVisible / 2)) {
      startPage = Math.max(2, totalPages - maxVisible + 1);
    }

    if (startPage > 2) {
      pages.push("...");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return (
      <div className="pagination-container">
        <button
          className="page-nav"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          «
        </button>

        {pages.map((item, index) => {
          if (item === "...") {
            return <span key={`ellipsis-${index}`} className="page-ellipsis">...</span>;
          }

          return (
            <button
              key={`page-${item}`}
              className={`page-btn ${page === item ? "active" : ""}`}
              onClick={() => setPage(item as number)}
            >
              {item}
            </button>
          );
        })}

        <button
          className="page-nav"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          »
        </button>
      </div>
    );
  };

  return (
    <div className="reviews-section mt-4">
      {/* Header with left info + right search */}
      <div className="reviews-header mb-3">
        <div className="reviews-info">
          <h5 className="mb-0">{totalReviews} Reviews</h5>
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="review-search">
          <input
            type="text"
            placeholder="Search reviews, users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isSearching && <span className="searching-indicator">...</span>}
        </div>
      </div>

      <div id="reviews-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div>Loading reviews...</div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">No reviews found</div>
            <div className="small text-muted">
              <p>Try:</p>
              <ul className="list-unstyled">
                <li>• Expanding your date range</li>
                <li>• Selecting fewer filters</li>
                <li>• Checking different countries/platforms</li>
                {debouncedSearch && <li>• Removing search terms</li>}
              </ul>
            </div>
          </div>
        ) : (
          reviews.map((review, index) => {
            const sentimentClass = review.sentiment?.toLowerCase() || "neutral";

            return (
              <div key={index} className="review-item">
                <div className={`review-bar ${sentimentClass}`}></div>

                <div className="review-emoji">
                  {sentimentEmoji(review.sentiment)}
                </div>

                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center">
                      <strong
                        dangerouslySetInnerHTML={{
                          __html: highlightText(review.username, debouncedSearch)
                        }}
                      />

                      <span className="platform-badge badge bg-secondary ms-2">
                        {review.platform}
                      </span>
                    </div>

                    <span className={`sentiment-pill ${sentimentClass}`}>
                      {review.sentiment}
                    </span>
                  </div>

                  <div
                    className="review-text"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(review.message, debouncedSearch)
                    }}
                  />

                  <div className="review-footer">
                    <div className="review-meta">
                      <strong>{formatDate(review.created_date)}</strong> –
                      <strong>
                        {review.country}
                        <span className="review-stars ms-1">
                          {renderStars(review.rating)}
                        </span>
                      </strong>
                    </div>

                    {review.link && (
                      <a href={review.link} target="_blank" rel="noreferrer">
                        View Original
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && !loading && renderPagination()}
    </div>
  );
};

export default ReviewTab;