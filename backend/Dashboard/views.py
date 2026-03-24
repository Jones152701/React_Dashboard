from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
import math
import re
from collections import Counter
from datetime import datetime, timedelta


class SocialMediaDailyView(APIView):

    def get(self, request):

        table = "lens_src.lyca_social_media_reviews"

        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")
        countries = request.GET.get("countries")
        platforms = request.GET.get("platforms")
        sentiments = request.GET.get("sentiments")
        search = request.GET.get("search", "").strip()
        
        # =============== EXPLICIT REQUEST TYPE DETECTION ===============
        request_type = request.GET.get("type", "dashboard")  # 'dashboard' or 'reviews'
        is_review_request = request_type == "reviews"
        
        # Page-based pagination (only used for review requests)
        page = int(request.GET.get("page", 1))
        limit = 15
        offset = (page - 1) * limit

        # =============== DEBUG PRINT ===============
        print("\n===== REQUEST DEBUG =====")
        print(f"Request Type: {request_type}")
        print(f"From Date: {from_date}")
        print(f"To Date: {to_date}")
        print(f"Countries: {countries}")
        print(f"Platforms: {platforms}")
        print(f"Sentiments: {sentiments}")
        print(f"Search: '{search}'")
        print(f"Page: {page if is_review_request else 'N/A'}")
        print("========================\n")

        # =============== FIXED: Separate date params from filter params ===============
        date_params = []
        filter_params = []
        filters = []

        # Handle date separately - NOT added to main filters
        if from_date and to_date:
            # Store date params separately for KPI query
            date_params = [from_date, to_date]
        else:
            # Default to last 30 days
            current_to = datetime.now()
            current_from = current_to - timedelta(days=30)
            from_date = current_from.strftime("%Y-%m-%d")
            to_date = current_to.strftime("%Y-%m-%d")
            date_params = [from_date, to_date]

        # Build non-date filters
        if countries and countries.lower() != 'all' and countries != 'all':
            country_list = [c.lower() for c in countries.split(",") if c.lower() != 'all']
            if country_list:
                placeholders = ",".join(["%s"] * len(country_list))
                filters.append(f"LOWER(country) IN ({placeholders})")
                filter_params.extend(country_list)

        if platforms and platforms.lower() != 'all' and platforms != 'all':
            platform_list = [p.lower() for p in platforms.split(",") if p.lower() != 'all']
            if platform_list:
                placeholders = ",".join(["%s"] * len(platform_list))
                filters.append(f"LOWER(platform) IN ({placeholders})")
                filter_params.extend(platform_list)

        if sentiments and sentiments.lower() != 'all' and sentiments != 'all':
            sentiment_list = [s.lower() for s in sentiments.split(",") if s.lower() != 'all']
            if sentiment_list:
                placeholders = ",".join(["%s"] * len(sentiment_list))
                filters.append(f"LOWER(sentiment) IN ({placeholders})")
                filter_params.extend(sentiment_list)

        # Safe search with parameterization (only for review requests)
        if search and is_review_request:
            filters.append("""
                (
                    LOWER(message) LIKE %s
                    OR LOWER(username) LIKE %s
                    OR LOWER(platform) LIKE %s
                    OR LOWER(country) LIKE %s
                )
            """)
            search_pattern = f"%{search.lower()}%"
            filter_params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

        # Build WHERE clause WITHOUT date filters
        where_clause = ""
        if filters:
            where_clause = "WHERE " + " AND ".join(filters)

        try:

            with connection.cursor() as cursor:

                # Parse dates for period comparison
                current_from = datetime.strptime(from_date, "%Y-%m-%d")
                current_to = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
                
                # Previous period (same length, before current)
                diff_days = (current_to - current_from).days
                prev_to = current_from
                prev_from = prev_to - timedelta(days=diff_days)
                
                # Format for SQL
                current_from_str = current_from.strftime("%Y-%m-%d")
                current_to_str = current_to.strftime("%Y-%m-%d")
                prev_from_str = prev_from.strftime("%Y-%m-%d")
                prev_to_str = prev_to.strftime("%Y-%m-%d")

                # =============== DEBUG: Check data availability ===============
                debug_query = f"""
                    SELECT 
                        COUNT(*) as total,
                        MIN(created_date) as earliest,
                        MAX(created_date) as latest,
                        COUNT(DISTINCT country) as countries,
                        COUNT(DISTINCT platform) as platforms,
                        COUNT(DISTINCT sentiment) as sentiments
                    FROM {table}
                    WHERE created_date >= %s AND created_date < %s
                """

                cursor.execute(debug_query, [current_from_str, current_to_str])
                debug_result = cursor.fetchone()

                print("\n===== DATA DEBUG =====")
                print(f"Total records in date range: {debug_result[0]}")
                print(f"Earliest date: {debug_result[1]}")
                print(f"Latest date: {debug_result[2]}")
                print(f"Unique countries: {debug_result[3]}")
                print(f"Unique platforms: {debug_result[4]}")
                print(f"Unique sentiments: {debug_result[5]}")
                print("======================\n")

                if debug_result[0] == 0:
                    print("⚠️ WARNING: No data found in the selected date range!")
                    print(f"Try expanding: current range {current_from_str} to {current_to_str}")

                # =============== DEBUG: Check filter application ===============
                if filters:
                    filter_preview_query = f"""
                        SELECT COUNT(*) 
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s"}
                    """

                    preview_params = filter_params.copy() if filter_params else []
                    preview_params.extend([current_from_str, current_to_str])

                    cursor.execute(filter_preview_query, preview_params)
                    filtered_count = cursor.fetchone()[0]

                    print("\n===== FILTER DEBUG =====")
                    print(f"Records after filters + date: {filtered_count}")
                    print(f"Where clause: {where_clause}")
                    print(f"Filter params: {filter_params}")
                    print(f"Date range: {current_from_str} to {current_to_str}")
                    print("========================\n")

                    # If filtered_count is 0, check without filters
                    if filtered_count == 0 and filter_params:
                        cursor.execute(
                            f"SELECT COUNT(*) FROM {table} WHERE created_date >= %s AND created_date < %s",
                            [current_from_str, current_to_str]
                        )
                        unfiltered_count = cursor.fetchone()[0]
                        print(f"⚠️ Without filters: {unfiltered_count} records exist")
                        print("→ Your filters are too restrictive!")

                # =============== FOR REVIEW REQUESTS - ONLY RETURN REVIEWS ===============
                if is_review_request:
                    
                    # ---------------- Reviews (Paginated with Search) ----------------
                    review_query = f"""
                        SELECT
                            username,
                            platform,
                            message,
                            sentiment,
                            user_rating,
                            country,
                            created_date,
                            link
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        ORDER BY created_date DESC
                        LIMIT %s
                        OFFSET %s
                    """

                    paginated_params = filter_params.copy() if filter_params else []
                    paginated_params.extend([current_from_str, current_to_str, limit, offset])
                    
                    cursor.execute(review_query, paginated_params)
                    review_rows = cursor.fetchall()

                    reviews = [
                        {
                            "username": row[0],
                            "platform": row[1],
                            "message": row[2],
                            "sentiment": row[3],
                            "rating": row[4],
                            "country": row[5],
                            "created_date": row[6],
                            "link": row[7],
                        }
                        for row in review_rows
                    ]

                    # ---------------- Total Reviews Count (Current Period) ----------------
                    count_query = f"""
                        SELECT COUNT(*)
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """

                    count_params = filter_params.copy() if filter_params else []
                    count_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(count_query, count_params)
                    total_reviews = cursor.fetchone()[0] or 0
                    
                    # Calculate total pages
                    total_pages = math.ceil(total_reviews / limit) if total_reviews > 0 else 0

                    print(f"\n===== REVIEW RESPONSE =====")
                    print(f"Total reviews found: {total_reviews}")
                    print(f"Total pages: {total_pages}")
                    print(f"Reviews returned: {len(reviews)}")
                    print("===========================\n")

                    return Response({
                        "reviews": reviews,
                        "total_reviews": total_reviews,
                        "total_pages": total_pages,
                        "current_page": page,
                        "limit": limit,
                        "offset": offset,
                    })

                # =============== FOR DASHBOARD REQUESTS - RETURN ALL CHARTS DATA ===============
                else:
                    
                    # =============== OPTIMIZED KPI CALCULATION (SINGLE SCAN) ===============
                    
                    def percentage_change(current, previous):
                        """Calculate percentage change with bounds"""
                        if previous == 0:
                            return 0.0
                        change = ((current - previous) / previous) * 100
                        return max(min(change, 100), -100)

                    def get_trend(value):
                        """Determine trend direction from percentage change"""
                        if value > 0:
                            return "up"
                        elif value < 0:
                            return "down"
                        return "flat"

                    def build_card(current, previous, is_rating=False):
                        """Helper to build card with consistent format"""
                        change = percentage_change(current, previous)
                        if is_rating:
                            return {
                                "value": round(float(current), 2),
                                "max_rating": 5,
                                "stars": round(float(current), 1),
                                "trend": {
                                    "value": round(change, 1),
                                    "direction": get_trend(change)
                                }
                            }
                        else:
                            return {
                                "count": current,
                                "trend": {
                                    "value": round(change, 1),
                                    "direction": get_trend(change)
                                }
                            }

                    # Build optimized KPI query with conditional aggregation
                    kpi_query = f"""
                    SELECT 
                        -- CURRENT PERIOD
                        COUNT(CASE WHEN created_date >= %s AND created_date < %s THEN 1 END) AS current_total,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) AS current_positive,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) AS current_neutral,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) AS current_negative,
                        AVG(CASE WHEN created_date >= %s AND created_date < %s THEN user_rating END) AS current_avg,
                        
                        -- PREVIOUS PERIOD
                        COUNT(CASE WHEN created_date >= %s AND created_date < %s THEN 1 END) AS prev_total,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) AS prev_positive,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) AS prev_neutral,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) AS prev_negative,
                        AVG(CASE WHEN created_date >= %s AND created_date < %s THEN user_rating END) AS prev_avg
                    FROM {table}
                    {where_clause}  -- This only has non-date filters!
                    """

                    # Prepare parameters in correct order
                    kpi_params = [
                        current_from_str, current_to_str,  # current_total
                        current_from_str, current_to_str,  # current_positive
                        current_from_str, current_to_str,  # current_neutral
                        current_from_str, current_to_str,  # current_negative
                        current_from_str, current_to_str,  # current_avg
                        prev_from_str, prev_to_str,        # prev_total
                        prev_from_str, prev_to_str,        # prev_positive
                        prev_from_str, prev_to_str,        # prev_neutral
                        prev_from_str, prev_to_str,        # prev_negative
                        prev_from_str, prev_to_str,        # prev_avg
                    ]
                    
                    # Add ONLY non-date filter params
                    kpi_params.extend(filter_params)

                    cursor.execute(kpi_query, kpi_params)
                    kpi_row = cursor.fetchone()

                    if kpi_row:
                        (
                            current_total,
                            current_positive,
                            current_neutral,
                            current_negative,
                            current_avg,
                            prev_total,
                            prev_positive,
                            prev_neutral,
                            prev_negative,
                            prev_avg
                        ) = kpi_row
                        
                        # Build cards with proper format using helper function
                        cards = {
                            "total_reviews_card": build_card(current_total or 0, prev_total or 0),
                            "positive_card": build_card(current_positive or 0, prev_positive or 0),
                            "neutral_card": build_card(current_neutral or 0, prev_neutral or 0),
                            "negative_card": build_card(current_negative or 0, prev_negative or 0),
                            "avg_rating_card": build_card(float(current_avg or 0), float(prev_avg or 0), is_rating=True)
                        }
                        
                    else:
                        cards = {
                            "total_reviews_card": build_card(0, 0),
                            "positive_card": build_card(0, 0),
                            "neutral_card": build_card(0, 0),
                            "negative_card": build_card(0, 0),
                            "avg_rating_card": build_card(0, 0, is_rating=True)
                        }

                    # ---------------- Daily Sentiment ----------------
                    sentiment_query = f"""
                        SELECT 
                            DATE(created_date) AS day,
                            SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) AS positive,
                            SUM(CASE WHEN LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) AS neutral,
                            SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) AS negative
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY 1
                        ORDER BY 1
                    """

                    sentiment_params = filter_params.copy() if filter_params else []
                    sentiment_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(sentiment_query, sentiment_params)
                    sentiment_rows = cursor.fetchall()

                    daily_sentiment = [
                        {
                            "day": row[0],
                            "positive": row[1],
                            "neutral": row[2],
                            "negative": row[3],
                        }
                        for row in sentiment_rows
                    ]

                    # ---------------- Rating Distribution ----------------
                    rating_where = (
                        where_clause + f" AND user_rating IS NOT NULL AND created_date >= %s AND created_date < %s"
                        if where_clause
                        else f"WHERE user_rating IS NOT NULL AND created_date >= %s AND created_date < %s"
                    )

                    rating_query = f"""
                        SELECT 
                            user_rating,
                            COUNT(*) AS count
                        FROM {table}
                        {rating_where}
                        GROUP BY user_rating
                        ORDER BY user_rating
                    """

                    rating_params = filter_params.copy() if filter_params else []
                    rating_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(rating_query, rating_params)
                    rating_rows = cursor.fetchall()

                    rating_distribution = [
                        {
                            "rating": row[0],
                            "count": row[1]
                        }
                        for row in rating_rows
                    ]

                    # ---------------- Sentiment Score Trend ----------------
                    if where_clause:
                        score_where = where_clause + f" AND sentiment_score IS NOT NULL AND created_date >= %s AND created_date < %s"
                    else:
                        score_where = f"WHERE sentiment_score IS NOT NULL AND created_date >= %s AND created_date < %s"

                    score_query = f"""
                        SELECT
                            DATE(created_date) AS day,
                            AVG(sentiment_score) AS score
                        FROM {table}
                        {score_where}
                        GROUP BY 1
                        ORDER BY 1
                    """

                    score_params = filter_params.copy() if filter_params else []
                    score_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(score_query, score_params)
                    score_rows = cursor.fetchall()

                    sentiment_score_trend = [
                        {
                            "day": row[0],
                            "score": float(row[1]) if row[1] else 0
                        }
                        for row in score_rows
                    ]

                    # ---------------- Word Cloud & Hashtags ----------------
                    word_counter = Counter()
                    hashtag_counter = Counter()

                    try:
                        all_text_query = f"""
                            SELECT message
                            FROM {table}
                            {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        """

                        text_params = filter_params.copy() if filter_params else []
                        text_params.extend([current_from_str, current_to_str])
                        
                        cursor.execute(all_text_query, text_params)
                        # Filter out None/Null messages
                        messages = [row[0] for row in cursor.fetchall() if row[0] and isinstance(row[0], str)]

                        for msg in messages:
                            # Ensure message is string
                            if not isinstance(msg, str):
                                continue

                            # Handle empty messages
                            if not msg.strip():
                                continue

                            # Extract words and hashtags
                            words = re.findall(r'\b\w+\b', msg.lower())
                            hashtags = re.findall(r'#\w+', msg.lower())

                            word_counter.update(words)
                            hashtag_counter.update(hashtags)

                    except Exception as e:
                        print(f"WordCloud processing error: {str(e)}")
                        # Continue with empty counters rather than failing

                    # ✅ EXPANDED STOPWORDS
                    stopwords = set([
                        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", 
                        "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 
                        'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 
                        'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 
                        'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
                        'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 
                        'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 
                        'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 
                        'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 
                        'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
                        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 
                        'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should', "should've", 
                        'now', 'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't", 'doesn', "doesn't", 
                        'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't", 'ma', 'mightn', 
                        "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't", 
                        'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't", 'really', 'very', 
                        'quite', 'too', 'much', 'many', 'also', 'even', 'still', 'just', 'already', 'yet', 'however', 
                        'therefore', 'thus', 'hence', 'consequently', 'meanwhile', 'nevertheless', 'nonetheless', 
                        'otherwise', 'instead', 'furthermore', 'moreover', 'additionally', 'besides', 'indeed', 
                        'actually', 'basically', 'essentially', 'literally', 'seriously', 'honestly', 'personally', 
                        'generally', 'usually', 'normally', 'typically', 'often', 'sometimes', 'rarely', 'never', 
                        'always', 'forever', 'constantly', 'continuously', 'this', 'that', 'these', 'those', 'any', 
                        'some', 'every', 'each', 'all', 'both', 'either', 'neither', 'another', 'such', 'what', 
                        'which', 'whose', 'a', 'an', 'the', 'and', 'but', 'or', 'if', 'because', 'as', 'until', 
                        'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 
                        'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 
                        'off', 'over', 'under', 'again', 'further', 'then', 'once', 'have', 'has', 'had', 'do', 'does', 
                        'did', 'say', 'says', 'said', 'go', 'goes', 'went', 'get', 'gets', 'got', 'make', 'makes', 
                        'made', 'know', 'knows', 'knew', 'think', 'thinks', 'thought', 'take', 'takes', 'took', 'see', 
                        'sees', 'saw', 'come', 'comes', 'came', 'want', 'wants', 'wanted', 'look', 'looks', 'looked', 
                        'use', 'uses', 'used', 'find', 'finds', 'found', 'give', 'gives', 'gave', 'tell', 'tells', 
                        'told', 'work', 'works', 'worked', 'called', 'got', 'get', 'one', 'back', 'go', 'went', 'see', 
                        'know', 'tell', 'come', 'time', 'day', 'week', 'month', 'year', 'people', 'thing', 'way', 
                        'said', 'say', 'also', 'well', 'even', 'new', 'first', 'last', 'good', 'bad', 'great', 'really', 
                        'please', 'help', 'need', 'want', 'thank', 'thanks',
                        # Additional foreign/common words
                        'est', 'que', 'pour', 'les', 'des', 'une', 'dans', 'par', 'sur', 'avec',
                        'tout', 'plus', 'bien', 'tres', 'fait', 'faire', 'etre', 'avoir', 'cest',
                        'ca', 'cela', 'cette', 'comme', 'chez', 'aussi', 'donc', 'enfin', 'voila',
                        'alors', 'toujours', 'jamais', 'pendant', 'depuis', 'entre', 'sans', 'sous'
                    ])

                    # ✅ FILTER WORDS (min length 3, no stopwords)
                    if word_counter:
                        filtered_words = {
                            word: count
                            for word, count in word_counter.items()
                            if word not in stopwords and len(word) > 3 and not word.isdigit()
                        }
                        
                        # ✅ NORMALIZE VALUES
                        if filtered_words:
                            max_val = max(filtered_words.values())
                            if max_val > 0:
                                normalized_words = {
                                    word: int((count / max_val) * 100)
                                    for word, count in filtered_words.items()
                                }
                                # ✅ TAKE TOP 100
                                top_words = dict(
                                    sorted(normalized_words.items(), key=lambda x: x[1], reverse=True)[:100]
                                )
                            else:
                                top_words = {}
                        else:
                            top_words = {}
                    else:
                        top_words = {}

                    # ✅ TOP 10 HASHTAGS - exactly 10
                    if hashtag_counter:
                        top_hashtags = dict(hashtag_counter.most_common(10))
                    else:
                        top_hashtags = {}

                    # =============== AUDIENCE ANALYTICS QUERIES ===============

                    # 1️⃣ Language Distribution (Top 10)
                    language_query = f"""
                        SELECT LOWER(TRIM(language)) as language, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND language IS NOT NULL AND language != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE language IS NOT NULL AND language != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY LOWER(TRIM(language))
                        ORDER BY count DESC
                        LIMIT 10
                    """
                    
                    language_params = filter_params.copy() if filter_params else []
                    language_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(language_query, language_params)
                    language_rows = cursor.fetchall()

                    language_distribution = [
                        {"name": row[0].title() if row[0] else "Unknown", "value": row[1]}
                        for row in language_rows
                    ]

                    # 2️⃣ Gender Distribution
                    gender_query = f"""
                        SELECT LOWER(TRIM(gender)) as gender, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND gender IS NOT NULL AND gender != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE gender IS NOT NULL AND gender != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY LOWER(TRIM(gender))
                    """
                    
                    gender_params = filter_params.copy() if filter_params else []
                    gender_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(gender_query, gender_params)
                    gender_rows = cursor.fetchall()

                    gender_distribution = [
                        {"name": row[0].title() if row[0] else "Unknown", "value": row[1]}
                        for row in gender_rows
                    ]

                    # 3️⃣ Top Advocates (Positive users)
                    advocates_query = f"""
                        SELECT username, COUNT(*) as mentions
                        FROM {table}
                        {where_clause + " AND LOWER(sentiment) = 'positive' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE LOWER(sentiment) = 'positive' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY username
                        ORDER BY mentions DESC
                        LIMIT 10
                    """
                    
                    advocate_params = filter_params.copy() if filter_params else []
                    advocate_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(advocates_query, advocate_params)
                    advocate_rows = cursor.fetchall()

                    top_advocates = [
                        {"username": row[0], "mentions": row[1]}
                        for row in advocate_rows
                    ]

                    # 4️⃣ Top Detractors (Negative users)
                    detractors_query = f"""
                        SELECT username, COUNT(*) as mentions
                        FROM {table}
                        {where_clause + " AND LOWER(sentiment) = 'negative' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE LOWER(sentiment) = 'negative' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY username
                        ORDER BY mentions DESC
                        LIMIT 10
                    """
                    
                    detractor_params = filter_params.copy() if filter_params else []
                    detractor_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(detractors_query, detractor_params)
                    detractor_rows = cursor.fetchall()

                    top_detractors = [
                        {"username": row[0], "mentions": row[1]}
                        for row in detractor_rows
                    ]

                    # 5️⃣ Activity by Hour
                    activity_hour_query = f"""
                        SELECT EXTRACT(HOUR FROM created_date) as hour, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY hour
                        ORDER BY hour
                    """
                    
                    hour_params = filter_params.copy() if filter_params else []
                    hour_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(activity_hour_query, hour_params)
                    hour_rows = cursor.fetchall()

                    activity_by_hour = [
                        {
                            "hour": f"{int(int(row[0]) % 12 or 12)} {'AM' if int(row[0]) < 12 else 'PM'}",
                            "count": row[1]
                        }
                        for row in hour_rows
                    ]

                    # 6️⃣ Activity by Day of Week
                    activity_day_query = f"""
                        SELECT EXTRACT(DOW FROM created_date) as day, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY day
                        ORDER BY day
                    """
                    
                    day_params = filter_params.copy() if filter_params else []
                    day_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(activity_day_query, day_params)
                    day_rows = cursor.fetchall()

                    days_map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

                    activity_by_day = [
                        {
                            "day": days_map[int(row[0])],
                            "count": row[1]
                        }
                        for row in day_rows
                    ]

                    # =============== TOPIC & METRICS QUERIES ===============

                    # 1️⃣ Tree Map → Primary Mentions
                    primary_mentions_query = f"""
                        SELECT primary_mention, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND primary_mention IS NOT NULL AND primary_mention != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE primary_mention IS NOT NULL AND primary_mention != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY primary_mention
                        ORDER BY count DESC
                        LIMIT 20
                    """

                    primary_params = filter_params.copy() if filter_params else []
                    primary_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(primary_mentions_query, primary_params)
                    primary_rows = cursor.fetchall()

                    primary_mentions = [
                        {"name": row[0], "value": row[1]}
                        for row in primary_rows
                    ]

                    # 2️⃣ Issue Type (Horizontal Bar)
                    issue_type_query = f"""
                        SELECT issue_type, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND issue_type IS NOT NULL AND issue_type != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE issue_type IS NOT NULL AND issue_type != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY issue_type
                        ORDER BY count DESC
                    """

                    issue_params = filter_params.copy() if filter_params else []
                    issue_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(issue_type_query, issue_params)
                    issue_rows = cursor.fetchall()

                    issue_type_distribution = [
                        {"name": row[0], "value": row[1]}
                        for row in issue_rows
                    ]

                    # 3️⃣ Journey Stage vs Sentiment (STACKED BAR)
                    journey_query = f"""
                        SELECT 
                            journey_stage,
                            SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) as positive,
                            SUM(CASE WHEN LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) as neutral,
                            SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) as negative
                        FROM {table}
                        {where_clause + " AND journey_stage IS NOT NULL AND journey_stage != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE journey_stage IS NOT NULL AND journey_stage != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY journey_stage
                        ORDER BY journey_stage
                    """

                    journey_params = filter_params.copy() if filter_params else []
                    journey_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(journey_query, journey_params)
                    journey_rows = cursor.fetchall()

                    journey_sentiment = [
                        {
                            "stage": row[0],
                            "positive": row[1],
                            "neutral": row[2],
                            "negative": row[3],
                        }
                        for row in journey_rows
                    ]

                    # 4️⃣ Resolution Status
                    resolution_query = f"""
                        SELECT resolution_status, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND resolution_status IS NOT NULL AND resolution_status != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE resolution_status IS NOT NULL AND resolution_status != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY resolution_status
                        ORDER BY count DESC
                    """

                    resolution_params = filter_params.copy() if filter_params else []
                    resolution_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(resolution_query, resolution_params)
                    resolution_rows = cursor.fetchall()

                    resolution_status = [
                        {"name": row[0], "value": row[1]}
                        for row in resolution_rows
                    ]

                    # 5️⃣ Value for Money
                    value_query = f"""
                        SELECT value_for_money, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND value_for_money IS NOT NULL AND value_for_money != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE value_for_money IS NOT NULL AND value_for_money != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY value_for_money
                        ORDER BY count DESC
                    """

                    value_params = filter_params.copy() if filter_params else []
                    value_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(value_query, value_params)
                    value_rows = cursor.fetchall()

                    value_for_money = [
                        {"name": row[0], "value": row[1]}
                        for row in value_rows
                    ]

                    # 6️⃣ Churn Risk (Pie Chart)
                    churn_query = f"""
                        SELECT churn_risk, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND churn_risk IS NOT NULL AND churn_risk != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE churn_risk IS NOT NULL AND churn_risk != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY churn_risk
                    """

                    churn_params = filter_params.copy() if filter_params else []
                    churn_params.extend([current_from_str, current_to_str])
                    
                    cursor.execute(churn_query, churn_params)
                    churn_rows = cursor.fetchall()

                    churn_risk = [
                        {"name": row[0], "value": row[1]}
                        for row in churn_rows
                    ]

                    print(f"\n===== DASHBOARD RESPONSE =====")
                    print(f"Cards: {cards}")
                    print(f"Daily sentiment days: {len(daily_sentiment)}")
                    print(f"Rating distribution: {len(rating_distribution)}")
                    print(f"Score trend days: {len(sentiment_score_trend)}")
                    print(f"Word cloud words: {len(top_words)}")
                    print(f"Hashtags: {len(top_hashtags)}")
                    print("==============================\n")

                    return Response({
                        "cards": cards,
                        "daily_sentiment": daily_sentiment,
                        "rating_distribution": rating_distribution,
                        "sentiment_score_trend": sentiment_score_trend,
                        "wordcloud": top_words,
                        "top_hashtags": top_hashtags,
                        
                        # Audience Data
                        "language_distribution": language_distribution,
                        "gender_distribution": gender_distribution,
                        "top_advocates": top_advocates,
                        "top_detractors": top_detractors,
                        "activity_by_hour": activity_by_hour,
                        "activity_by_day": activity_by_day,
                        
                        # Topic & Metrics Data
                        "primary_mentions": primary_mentions,
                        "issue_type_distribution": issue_type_distribution,
                        "journey_sentiment": journey_sentiment,
                        "resolution_status": resolution_status,
                        "value_for_money": value_for_money,
                        "churn_risk": churn_risk,
                    })

        except Exception as e:
            # Better error logging
            print(f"ERROR in SocialMediaDailyView: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return Response(
                {
                    "error": "Failed to fetch dashboard data",
                    "detail": str(e)
                },
                status=500
            )
        



from django.db import connection
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime, timedelta


class LensAnalyticsView(APIView):

    # ================= CHART BUILDER =================
    def build_chart(
        self,
        chart_id,
        chart_type,
        data,
        x_key,
        y_label,
        title,
        tooltip,
        icon,
        layout=None,
        color=None,
        radius=None,
        margin=None,
        x_label_offset=None,
        y_label_offset=None
    ):

        config = {
            "xKey": x_key,
            "xLabel": x_key.capitalize(),
            "yLabel": y_label,
            "margin": margin or {"top": 20, "right": 10, "left": 20, "bottom": 30},
            "xLabelOffset": x_label_offset if x_label_offset is not None else -10,
            "yLabelOffset": y_label_offset if y_label_offset is not None else -10
        }

        if chart_type == "bar":
            layout = layout or "horizontal"
            color = color or "#7B61FF"

            final_radius = (
                radius if radius else
                ([0, 8, 8, 0] if layout == "vertical" else [8, 8, 0, 0])
            )

            config["layout"] = layout
            config["bars"] = [
                {"key": "value", "color": color, "radius": final_radius}
            ]

        elif chart_type == "area":
            color = color or "#7B61FF"
            config["areas"] = [{"key": "value", "color": color}]

        elif chart_type == "pie":
            config = {}

        return {
            "id": chart_id,
            "title": title,
            "tooltip": tooltip,
            "icon": icon,
            "type": chart_type,
            "data": data,
            "config": config
        }

    # ================= MAIN API =================
    def get(self, request):
        
        print("\n" + "="*80)
        print("🚀 LENS ANALYTICS API CALLED")
        print("="*80)

        table = "lens_src.prod_lens_user_requests"

        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")
        selected_user = request.GET.get("user")

        print(f"\n📅 Request Parameters:")
        print(f"   - From Date: {from_date}")
        print(f"   - To Date: {to_date}")
        print(f"   - Selected User: {selected_user if selected_user else 'None (All Users)'}")

        # ================= DATE HANDLING =================
        current_from = datetime.strptime(from_date, "%Y-%m-%d")
        current_to = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)

        diff_days = (current_to - current_from).days
        prev_to = current_from
        prev_from = prev_to - timedelta(days=diff_days)

        current_from_str = current_from.strftime("%Y-%m-%d")
        current_to_str = current_to.strftime("%Y-%m-%d")
        prev_from_str = prev_from.strftime("%Y-%m-%d")
        prev_to_str = prev_to.strftime("%Y-%m-%d")

        print(f"\n📊 Date Ranges:")
        print(f"   - Current: {current_from_str} to {current_to_str}")
        print(f"   - Previous: {prev_from_str} to {prev_to_str}")

        # ================= KPI QUERY =================
        print("\n🔍 Executing KPI Query...")
        kpi_query = f"""
        SELECT
            SUM(CASE WHEN created_date >= %s AND created_date < %s THEN 1 ELSE 0 END),
            COUNT(DISTINCT CASE WHEN created_date >= %s AND created_date < %s THEN recipient_name END),
            SUM(CASE WHEN created_date >= %s AND created_date < %s THEN 1 ELSE 0 END),
            COUNT(DISTINCT CASE WHEN created_date >= %s AND created_date < %s THEN recipient_name END)
        FROM {table}
        WHERE recipient_name IS NOT NULL AND recipient_name != ''
        """

        params = [
            current_from_str, current_to_str,
            current_from_str, current_to_str,
            prev_from_str, prev_to_str,
            prev_from_str, prev_to_str
        ]

        with connection.cursor() as cursor:
            cursor.execute(kpi_query, params)
            row = cursor.fetchone()

        current_total, current_users, prev_total, prev_users = row

        current_total = current_total or 0
        current_users = current_users or 0
        prev_total = prev_total or 0
        prev_users = prev_users or 0

        print(f"\n📈 KPI Results:")
        print(f"   - Current: {current_total} messages, {current_users} users")
        print(f"   - Previous: {prev_total} messages, {prev_users} users")

        current_avg = round(current_total / current_users, 2) if current_users else 0
        prev_avg = round(prev_total / prev_users, 2) if prev_users else 0

        # ================= TOP USERS (within date range) =================
        print("\n🏆 Fetching Top Users...")
        top_users_query = f"""
            SELECT recipient_name AS name, COUNT(*) AS value
            FROM {table}
            WHERE recipient_name IS NOT NULL AND recipient_name != ''
              AND created_date >= %s AND created_date < %s
            GROUP BY recipient_name
            ORDER BY value DESC
            LIMIT 20
        """
        
        # Use the end date + 1 day for proper range
        to_date_plus_one = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
        to_date_plus_one_str = to_date_plus_one.strftime("%Y-%m-%d")

        with connection.cursor() as cursor:
            cursor.execute(top_users_query, [from_date, to_date_plus_one_str])
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        top_users_data = [dict(zip(columns, row)) for row in rows]

        top_user = top_users_data[0]["name"] if top_users_data else "-"
        top_user_count = top_users_data[0]["value"] if top_users_data else 0
        
        print(f"   - Top User: {top_user} ({top_user_count} messages)")
        print(f"   - Total in Top 20: {len(top_users_data)}")

        # ================= DAILY TREND =================
        print("\n📅 Fetching Daily Data...")
        daily_query = f"""
            SELECT DATE(created_date) AS date, COUNT(*) AS value
            FROM {table}
            WHERE created_date >= %s AND created_date < %s
            GROUP BY DATE(created_date)
            ORDER BY DATE(created_date)
        """

        with connection.cursor() as cursor:
            cursor.execute(daily_query, [from_date, to_date_plus_one_str])
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        daily_data = [dict(zip(columns, row)) for row in rows]
        print(f"   - Daily Data Points: {len(daily_data)}")

        # ================= USERS LIST (only users active in date range) =================
        print("\n👥 Fetching Users Active in Date Range...")
        users_query = f"""
            SELECT DISTINCT recipient_name
            FROM {table}
            WHERE recipient_name IS NOT NULL AND recipient_name != ''
              AND created_date >= %s AND created_date < %s
            ORDER BY recipient_name
        """

        with connection.cursor() as cursor:
            cursor.execute(users_query, [from_date, to_date_plus_one_str])
            users = [row[0] for row in cursor.fetchall()]
        
        print(f"   - Total Active Users: {len(users)}")
        if users:
            print(f"   - Sample Users: {users[:5]}")

        # ================= USER DRILLDOWN =================
        print("\n" + "="*80)
        print("👤 USER DRILLDOWN SECTION")
        print("="*80)
        
        user_chart = None
        user_messages = []

        print(f"\n🔍 Checking User Drilldown:")
        print(f"   - Selected User: {selected_user if selected_user else 'None'}")
        
        if selected_user:
            # Check if user exists in active users
            user_exists = selected_user in users
            print(f"   - User Active in Date Range: {user_exists}")
            
            if user_exists:
                print(f"\n✅ User '{selected_user}' found. Fetching detailed data...")
                
                # -------- DAILY CHART --------
                print(f"\n📊 Fetching daily activity for user: {selected_user}")
                user_daily_query = f"""
                    SELECT DATE(created_date) AS date, COUNT(*) AS value
                    FROM {table}
                    WHERE recipient_name = %s
                      AND created_date >= %s AND created_date < %s
                    GROUP BY DATE(created_date)
                    ORDER BY DATE(created_date)
                """

                with connection.cursor() as cursor:
                    cursor.execute(user_daily_query, [selected_user, from_date, to_date_plus_one_str])
                    columns = [col[0] for col in cursor.description]
                    rows = cursor.fetchall()
                    print(f"   - Raw Query Results: {len(rows)} rows")

                user_daily_data = [dict(zip(columns, row)) for row in rows]
                print(f"   - Processed Data Points: {len(user_daily_data)}")
                
                if user_daily_data:
                    # Ensure data has proper format
                    formatted_data = []
                    for item in user_daily_data:
                        formatted_data.append({
                            "date": str(item['date']) if item['date'] else "",
                            "value": int(item['value']) if item['value'] else 0
                        })
                    
                    print(f"   - Sample Formatted Data: {formatted_data[:3]}")
                    
                    # Calculate total
                    total_messages = sum(item['value'] for item in formatted_data)
                    print(f"   - Total Messages: {total_messages}")
                    
                    # Only create chart if there's data
                    if formatted_data and total_messages > 0:
                        user_chart = self.build_chart(
                            chart_id="user_daily",
                            chart_type="bar",
                            data=formatted_data,
                            x_key="date",
                            y_label="Messages",
                            title=f"{selected_user}'s Activity",
                            tooltip="Messages per day",
                            icon="bi-person-lines-fill",
                            layout="horizontal",
                            color="#10B981",
                            margin={"top": 25, "right": 0, "left": 18, "bottom": 30},
                            x_label_offset=-15,
                            y_label_offset=-10
                        )
                        print(f"   ✅ User chart created with {len(formatted_data)} data points")
                    else:
                        print(f"   ⚠️ No valid data for chart creation")
                else:
                    print(f"   ⚠️ No daily activity data found for user '{selected_user}'")

                # -------- MESSAGES --------
                print(f"\n💬 Fetching messages for user: {selected_user}")
                user_messages_query = f"""
                    SELECT message, created_date
                    FROM {table}
                    WHERE recipient_name = %s
                      AND created_date >= %s AND created_date < %s
                    ORDER BY created_date DESC
                """

                with connection.cursor() as cursor:
                    cursor.execute(user_messages_query, [selected_user, from_date, to_date_plus_one_str])
                    rows = cursor.fetchall()
                    print(f"   - Messages Found: {len(rows)}")

                user_messages = []
                for row in rows:
                    msg_date = row[1]
                    formatted_date = msg_date.strftime("%Y-%m-%d %H:%M:%S") if msg_date else None
                    user_messages.append({
                        "message": row[0] if row[0] else "No content",
                        "date": formatted_date
                    })
                
                if user_messages:
                    print(f"   - Sample Message: {user_messages[0]['message'][:100]}...")
                    print(f"   - Sample Date: {user_messages[0]['date']}")
                
            else:
                print(f"\n❌ User '{selected_user}' not active in selected date range!")
                print(f"   - Total Active Users: {len(users)}")
                if users:
                    print(f"   - Sample Active Users: {users[:5]}")
        else:
            print(f"\nℹ️ No user selected for drilldown")

        # ================= HELPERS =================
        def percentage_change(current, previous):
            if previous == 0:
                return 0.0
            change = ((current - previous) / previous) * 100
            return max(min(change, 100), -100)

        def get_trend(value):
            if value > 0:
                return "up"
            elif value < 0:
                return "down"
            return "flat"

        def build_card(value, prev):
            change = percentage_change(value, prev)
            return {
                "value": value,
                "trend": {
                    "value": round(change, 1),
                    "direction": get_trend(change)
                }
            }

        # ================= CARDS =================
        cards = {
            "total_messages": build_card(current_total, prev_total),
            "unique_users": build_card(current_users, prev_users),
            "avg_messages_per_user": {
                "value": current_avg,
                "trend": {
                    "value": round(percentage_change(current_avg, prev_avg), 1),
                    "direction": get_trend(percentage_change(current_avg, prev_avg))
                }
            },
            "top_user": {
                "value": top_user,
                "count": top_user_count,
                "trend": {"value": 0, "direction": "flat"}
            }
        }

        # ================= BUILD CHARTS =================

        # 📊 Top Users Chart
        if top_users_data:
            top_users_chart = self.build_chart(
                chart_id="top_users",
                chart_type="bar",
                data=top_users_data,
                x_key="name",
                y_label="Count",
                title="Top 20 Users",
                tooltip="Users who used Lens",
                icon="bi-bar-chart-fill",
                layout="horizontal",
                color="#7B61FF",
                margin={"top": 25, "right": 10, "left": 30, "bottom": 30},
                x_label_offset=-19,
                y_label_offset=-10
            )
        else:
            top_users_chart = None
            print("⚠️ No top users data available")

        # 📈 Daily Trend Chart
        if daily_data:
            daily_count_chart = self.build_chart(
                chart_id="daily_count",
                chart_type="area",
                data=daily_data,
                x_key="date",
                y_label="Count",
                title="Daily Usage Trend",
                tooltip="Messages per day",
                icon="bi-graph-up",
                color="#3B82F6",
                margin={"top": 25, "right": 10, "left": 30, "bottom": 30},
                x_label_offset=-19,
                y_label_offset=-15
            )
        else:
            daily_count_chart = None
            print("⚠️ No daily data available")

        # ================= RESPONSE =================
        main_charts = []
        if daily_count_chart:
            main_charts.append(daily_count_chart)
        if top_users_chart:
            main_charts.append(top_users_chart)

        print("\n" + "="*80)
        print("📤 FINAL RESPONSE SUMMARY")
        print("="*80)
        print(f"   - Cards: 4 KPIs")
        print(f"   - Main Charts: {len(main_charts)}")
        print(f"   - Active Users: {len(users)}")
        print(f"   - User Chart: {'Yes' if user_chart else 'No'}")
        print(f"   - User Messages: {len(user_messages)}")
        if user_chart:
            print(f"   - User Chart Data Points: {len(user_chart.get('data', []))}")
        print("="*80 + "\n")

        all_charts = main_charts.copy()

        if user_chart:
            all_charts.append(user_chart)

        return Response({
            "cards": cards,
            "charts": all_charts,   # ✅ FIX
            "users": users,
            "selected_user_messages": user_messages if selected_user and user_exists else []
        })





 