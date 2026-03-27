from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
import math
import re
from collections import Counter
from datetime import datetime, timedelta
from .chart_builder import build_chart




class LensAnalyticsView(APIView):

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
        user_exists = False

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
                        # ✅ FIXED: Use y_key instead of y_label
                        user_chart = build_chart(
                            chart_id="user_daily",
                            chart_type="bar",
                            data=formatted_data,
                            x_key="date",
                            y_key="value",  # ✅ FIXED
                            title=f"{selected_user}'s Activity",
                            tooltip="Messages per day",
                            icon="bi-person-lines-fill",
                            layout="horizontal",
                            color="#10B981",
                            margin={"top": 25, "right": 0, "left": 18, "bottom": 30},
                            x_label_offset=-15,
                            y_label_offset=-10,
                            is_date=True  # ✅ IMPORTANT
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
            # ✅ FIXED: Use y_key instead of y_label
            top_users_chart = build_chart(
                chart_id="top_users",
                chart_type="bar",
                data=top_users_data,
                x_key="name",
                y_key="value",  # ✅ FIXED
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
            # ✅ FIXED: Use y_key and area chart type
            daily_count_chart = build_chart(
                chart_id="daily_count",
                chart_type="area",  # ✅ NOW VALID
                data=daily_data,
                x_key="date",
                y_key="value",  # ✅ FIXED
                title="Daily Usage Trend",
                tooltip="Messages per day",
                icon="bi-graph-up",
                color="#3B82F6",
                margin={"top": 25, "right": 10, "left": 30, "bottom": 30},
                x_label_offset=-19,
                y_label_offset=-15,
                is_date=True  # ✅ IMPORTANT
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
            "charts": all_charts,
            "users": users,
            "selected_user_messages": user_messages if selected_user and user_exists else []
        })






class SocialMediaDailyView(APIView):

    def get(self, request):
        import re
        from collections import Counter
        from datetime import datetime, timedelta
        import math
        from django.db import connection
        from rest_framework.response import Response
        from rest_framework.views import APIView

        table = "lens_src.lyca_social_media_reviews"

        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")
        countries = request.GET.get("countries")
        platforms = request.GET.get("platforms")
        sentiments = request.GET.get("sentiments")
        search = request.GET.get("search", "").strip()
        
        # =============== EXPLICIT REQUEST TYPE DETECTION ===============
        request_type = request.GET.get("type", "dashboard")  # 'dashboard', 'reviews', or 'drilldown'
        is_review_request = request_type == "reviews"
        is_drilldown_request = request_type == "drilldown"
        
        # Page-based pagination (only used for review requests)
        page = int(request.GET.get("page", 1))
        limit = 15
        offset = (page - 1) * limit

        # =============== DRILLDOWN PARAMETERS ===============
        drill_key = request.GET.get("drill_key", "")      # e.g., 'platform', 'country', 'sentiment'
        drill_value = request.GET.get("drill_value", "")  # e.g., 'twitter', 'US', 'positive'

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
        if is_drilldown_request:
            print(f"Drill Key: {drill_key}")
            print(f"Drill Value: {drill_value}")
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

        # Add drilldown filter if this is a drilldown request
        if is_drilldown_request and drill_key and drill_value:
            # Map drill keys to database columns
            drill_column_map = {
                "platform": "platform",
                "country": "country", 
                "sentiment": "sentiment",
                "segment": "sentiment",  # ✅ FIX: Map frontend 'segment' to database 'sentiment'
                "text": "message",       # ✅ NEW: Map frontend 'text' to database 'message'
                "primary_mention": "primary_mention",
                "issue_type": "issue_type",
                "journey_stage": "journey_stage",
                "churn_risk": "churn_risk",
                "resolution_status": "resolution_status",
                "value_for_money": "value_for_money",
                "gender": "gender",
                "language": "language"
            }
            
            if drill_key in drill_column_map:
                column = drill_column_map[drill_key]
                filters.append(f"LOWER({column}) = %s")
                filter_params.append(drill_value.lower())

        # Safe search with parameterization (only for review and drilldown requests)
        if search and (is_review_request or is_drilldown_request):
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
                
                # Previous period (same length, before current) - for dashboard only
                if not is_drilldown_request:
                    diff_days = (current_to - current_from).days
                    prev_to = current_from
                    prev_from = prev_to - timedelta(days=diff_days)
                    
                    # Format for SQL
                    current_from_str = current_from.strftime("%Y-%m-%d")
                    current_to_str = current_to.strftime("%Y-%m-%d")
                    prev_from_str = prev_from.strftime("%Y-%m-%d")
                    prev_to_str = prev_to.strftime("%Y-%m-%d")
                else:
                    # For drilldown, we only need current period
                    current_from_str = current_from.strftime("%Y-%m-%d")
                    current_to_str = current_to.strftime("%Y-%m-%d")


                # =============== FOR DRILLDOWN REQUESTS - RETURN MINI-DASHBOARD ===============
                if is_drilldown_request:
                    
                    # ✅ HELPER FUNCTION FOR DATE VALIDATION
                    def is_valid_date(val):
                        """Validate YYYY-MM-DD date format"""
                        return isinstance(val, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", val) is not None
                    
                    # ✅ PRODUCTION-GRADE COLUMN MAP WITH TYPE INFORMATION
                    COLUMN_MAP = {
                        # String fields (use LOWER() for case-insensitive matching)
                        "platform": ("platform", "string"),
                        "country": ("country", "string"),
                        "sentiment": ("sentiment", "string"),
                        
                        # Map frontend 'segment' to database 'sentiment'
                        "segment": ("sentiment", "string"),
                        
                        # Map frontend 'text' to database 'message' for word cloud drilldown
                        "text": ("message", "string"),
                        
                        "primary_mention": ("primary_mention", "string"),
                        "issue_type": ("issue_type", "string"),
                        "journey_stage": ("journey_stage", "string"),
                        "churn_risk": ("churn_risk", "string"),
                        "resolution_status": ("resolution_status", "string"),
                        "value_for_money": ("value_for_money", "string"),
                        "gender": ("gender", "string"),
                        "language": ("language", "string"),
                        
                        # Numeric fields (direct equality, no LOWER())
                        "rating": ("user_rating", "number"),
                        "user_rating": ("user_rating", "number"),
                        
                        # Date fields (special handling)
                        "created_date": ("created_date", "date"),
                        "day": ("created_date", "date"),
                        "date": ("created_date", "date"),
                    }
                    
                    # Make a copy of the base filters
                    drill_filters = filters.copy() if filters else []
                    drill_filter_params = filter_params.copy() if filter_params else []
                    
                    # ✅ Add drilldown filter with proper type handling
                    if drill_key and drill_value:
                        # Get column info from map, default to string type
                        db_column, col_type = COLUMN_MAP.get(drill_key, (drill_key, "string"))
                        
                        print(f"🔍 Drill Debug - Key: {drill_key}, Value: {drill_value}, Column: {db_column}, Type: {col_type}")
                        
                        try:
                            # Handle based on data type
                            if col_type == "number":
                                # Numeric field - direct equality, no LOWER()
                                filter_condition = f"{db_column} = %s"
                                filter_value = int(drill_value)
                                print(f"✅ Applied numeric filter: {db_column} = {filter_value}")
                                
                            elif col_type == "date":
                                # Date field - handle date conversion with validation
                                if is_valid_date(drill_value):
                                    filter_condition = f"DATE({db_column}) = %s"
                                    filter_value = drill_value
                                    print(f"✅ Applied date filter: DATE({db_column}) = {drill_value}")
                                else:
                                    print(f"⚠️ Invalid date format: {drill_value}, skipping filter")
                                    filter_condition = None
                                    
                            else:  # string type
                                # Handle text/word cloud with LIKE instead of exact match
                                value = str(drill_value).lower()
                                
                                # Special handling for text/word cloud drilldown
                                if drill_key == "text":
                                    filter_condition = f"LOWER({db_column}) LIKE %s"
                                    filter_value = f"%{value}%"
                                    print(f"✅ Applied text search: {db_column} LIKE '%{value}%'")
                                else:
                                    filter_condition = f"LOWER({db_column}) = %s"
                                    filter_value = value
                                    print(f"✅ Applied string filter: LOWER({db_column}) = '{value}'")
                            
                            # ✅ CRITICAL FIX: Rebuild filters and params together
                            if filter_condition:
                                # Rebuild both arrays, removing any existing filters for this column
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if db_column not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing filter(s) for column '{db_column}'")
                                
                                # Replace with cleaned lists
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                # Add the new filter and its param
                                drill_filters.append(filter_condition)
                                drill_filter_params.append(filter_value)
                                print(f"✅ Added new filter: {filter_condition}")
                                    
                        except Exception as e:
                            print(f"❌ Error applying drill filter: {e}")
                            import traceback
                            traceback.print_exc()
                    
                    # ✅ Handle drill context (additional filters from charts)
                    drill_context = request.GET.get("drill_context")
                    
                    if drill_context:
                        try:
                            import json
                            context_data = json.loads(drill_context)
                            
                            print(f"🔍 Drill Context Received: {context_data}")
                            
                            # ✅ Handle DATE only if valid (YYYY-MM-DD format)
                            if "day" in context_data and is_valid_date(context_data["day"]):
                                # Rebuild arrays, removing existing date filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "DATE(created_date)" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing date filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("DATE(created_date) = %s")
                                drill_filter_params.append(context_data["day"])
                                print(f"✅ Added DATE filter: {context_data['day']}")
                            
                            # ✅ Handle journey stage filter
                            if "stage" in context_data and context_data["stage"]:
                                # Rebuild arrays, removing existing stage filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "journey_stage" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing stage filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("LOWER(journey_stage) = %s")
                                drill_filter_params.append(context_data["stage"].lower())
                                print(f"✅ Added stage filter: {context_data['stage']}")
                            
                            # ✅ Handle segment filter
                            if "segment" in context_data and context_data["segment"] and drill_key != "segment":
                                # Rebuild arrays, removing existing sentiment filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "sentiment" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing sentiment filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("LOWER(sentiment) = %s")
                                drill_filter_params.append(context_data["segment"].lower())
                                print(f"✅ Added segment filter: {context_data['segment']}")
                            
                            # ✅ Handle text filter from context (for word cloud)
                            if "text" in context_data and context_data["text"] and drill_key != "text":
                                # Rebuild arrays, removing existing message filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "message" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing message filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("LOWER(message) LIKE %s")
                                drill_filter_params.append(f"%{context_data['text'].lower()}%")
                                print(f"✅ Added text filter: {context_data['text']}")
                            
                            # ✅ Handle platform filter from context
                            if "platform" in context_data and context_data["platform"] and drill_key != "platform":
                                # Rebuild arrays, removing existing platform filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "platform" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing platform filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("LOWER(platform) = %s")
                                drill_filter_params.append(context_data["platform"].lower())
                                print(f"✅ Added platform filter: {context_data['platform']}")
                            
                            # ✅ Handle country filter from context
                            if "country" in context_data and context_data["country"] and drill_key != "country":
                                # Rebuild arrays, removing existing country filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "country" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing country filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("LOWER(country) = %s")
                                drill_filter_params.append(context_data["country"].lower())
                                print(f"✅ Added country filter: {context_data['country']}")
                            
                            # ✅ Handle sentiment filter from context
                            if "sentiment" in context_data and context_data["sentiment"] and drill_key != "sentiment":
                                # Rebuild arrays, removing existing sentiment filters
                                new_filters = []
                                new_params = []
                                
                                for f, p in zip(drill_filters, drill_filter_params):
                                    if "sentiment" not in f:
                                        new_filters.append(f)
                                        new_params.append(p)
                                
                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing sentiment filter(s)")
                                
                                drill_filters = new_filters
                                drill_filter_params = new_params
                                
                                drill_filters.append("LOWER(sentiment) = %s")
                                drill_filter_params.append(context_data["sentiment"].lower())
                                print(f"✅ Added sentiment filter: {context_data['sentiment']}")
                            
                        except json.JSONDecodeError as e:
                            print(f"⚠️ Invalid JSON in drill_context: {e}")
                        except Exception as e:
                            print(f"⚠️ Drill context parsing failed: {e}")
                            import traceback
                            traceback.print_exc()
                    
                    # ✅ Rebuild where_clause with drill filters
                    drill_where_clause = ""
                    if drill_filters:
                        drill_where_clause = "WHERE " + " AND ".join(drill_filters)
                        print(f"✅ Final Drill WHERE clause: {drill_where_clause}")
                        print(f"✅ Final Drill params: {drill_filter_params}")
                    else:
                        print(f"⚠️ No drill filters applied!")
                    
                    # Prepare parameters for drilldown queries
                    drill_params = drill_filter_params.copy()
                    drill_params.extend([current_from_str, current_to_str])
                    
                    # =============== KPI CARDS ===============
                    kpi_query = f"""
                        SELECT
                            COUNT(*) as total_reviews,
                            AVG(user_rating) as avg_rating,
                            AVG(sentiment_score) as avg_sentiment
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """
                    
                    print(f"📊 KPI Query: {kpi_query}")
                    print(f"📊 KPI Params: {drill_params}")
                    
                    cursor.execute(kpi_query, drill_params)
                    kpi_row = cursor.fetchone()
                    
                    total_reviews = kpi_row[0] or 0 if kpi_row else 0
                    avg_rating = float(kpi_row[1] or 0) if kpi_row else 0
                    avg_sentiment = float(kpi_row[2] or 0) if kpi_row else 0
                    
                    # Get total for percentage calculation
                    total_query = f"""
                        SELECT COUNT(*)
                        FROM {table}
                        WHERE created_date >= %s AND created_date < %s
                    """
                    
                    cursor.execute(total_query, [current_from_str, current_to_str])
                    grand_total = cursor.fetchone()[0] or 1
                    
                    percentage = round((total_reviews / grand_total) * 100, 2) if grand_total > 0 else 0
                    
                    cards = {
                        "total_reviews": total_reviews,
                        "avg_rating": round(avg_rating, 2),
                        "avg_sentiment_score": round(avg_sentiment, 3),
                        "percentage_of_total": percentage
                    }
                    
                    print(f"📊 KPI Results - Filtered: {total_reviews}, Total: {grand_total}, Percentage: {percentage}%")
                    
                    # =============== DAILY TREND ===============
                    daily_trend = []
                    if drill_key != "text":
                        trend_query = f"""
                            SELECT DATE(created_date) as day, COUNT(*) as count
                            FROM {table}
                            {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                            GROUP BY DATE(created_date)
                            ORDER BY day
                        """
                        
                        cursor.execute(trend_query, drill_params)
                        trend_rows = cursor.fetchall()
                        
                        daily_trend = [
                            {"day": row[0].strftime("%Y-%m-%d") if hasattr(row[0], 'strftime') else row[0], "count": row[1]}
                            for row in trend_rows
                        ]
                        
                        print(f"📈 Daily trend rows: {len(daily_trend)}")
                    else:
                        print(f"📈 Skipping daily trend for text/word cloud drilldown")
                    
                    # =============== PLATFORM DISTRIBUTION ===============
                    platform_query = f"""
                        SELECT platform, COUNT(*) as count
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY platform
                        ORDER BY count DESC
                    """
                    
                    cursor.execute(platform_query, drill_params)
                    platform_rows = cursor.fetchall()
                    
                    platform_distribution = [
                        {"platform": row[0] or "Unknown", "count": row[1]}
                        for row in platform_rows
                    ]
                    
                    print(f"📱 Platform distribution rows: {len(platform_distribution)}")
                    
                    # =============== SENTIMENT DISTRIBUTION ===============
                    sentiment_query = f"""
                        SELECT sentiment, COUNT(*) as count
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY sentiment
                    """
                    
                    cursor.execute(sentiment_query, drill_params)
                    sentiment_rows = cursor.fetchall()
                    
                    sentiment_distribution = [
                        {"name": row[0] or "Unknown", "value": row[1]}
                        for row in sentiment_rows
                    ]
                    
                    print(f"🎯 Sentiment distribution rows: {len(sentiment_distribution)}")
                    
                    # =============== WORD CLOUD ===============
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
                        'est', 'que', 'pour', 'les', 'des', 'une', 'dans', 'par', 'sur', 'avec',
                        'tout', 'plus', 'bien', 'tres', 'fait', 'faire', 'etre', 'avoir', 'cest',
                        'ca', 'cela', 'cette', 'comme', 'chez', 'aussi', 'donc', 'enfin', 'voila',
                        'alors', 'toujours', 'jamais', 'pendant', 'depuis', 'entre', 'sans', 'sous'
                    ])
                    
                    word_counter = Counter()
                    
                    text_query = f"""
                        SELECT message
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """
                    
                    cursor.execute(text_query, drill_params)
                    messages = [row[0] for row in cursor.fetchall() if row[0] and isinstance(row[0], str)]
                    
                    for msg in messages:
                        if not msg.strip():
                            continue
                        words = re.findall(r'\b\w+\b', msg.lower())
                        word_counter.update(words)
                    
                    wordcloud = {}
                    if word_counter:
                        filtered_words = {
                            word: count
                            for word, count in word_counter.items()
                            if word not in stopwords and len(word) > 3 and not word.isdigit()
                        }
                        
                        if filtered_words:
                            max_val = max(filtered_words.values())
                            wordcloud = {
                                word: int((count / max_val) * 100)
                                for word, count in sorted(filtered_words.items(), key=lambda x: x[1], reverse=True)[:100]
                            }
                    
                    print(f"📝 Word cloud words: {len(wordcloud)}")
                    
                    # =============== REVIEWS LIST ===============
                    review_query = f"""
                        SELECT 
                            username,
                            platform,
                            message,
                            sentiment,
                            user_rating,
                            created_date,
                            country,
                            link
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        ORDER BY created_date DESC
                        LIMIT 50
                    """
                    
                    cursor.execute(review_query, drill_params)
                    review_rows = cursor.fetchall()
                    
                    reviews = [
                        {
                            "username": row[0],
                            "platform": row[1],
                            "message": row[2],
                            "sentiment": row[3],
                            "rating": row[4] if row[4] is not None else 0,
                            "created_date": row[5],
                            "country": row[6],
                            "link": row[7],
                        }
                        for row in review_rows
                    ]
                    
                    print(f"📋 Reviews returned: {len(reviews)}")
                    
                    # =============== BUILD CHARTS ===============
                    charts = []
                    
                    # Daily Trend Chart
                    if daily_trend and drill_key != "text":
                        charts.append({
                            "id": "daily_trend",
                            "type": "area",
                            "data": daily_trend,
                            "config": {
                                "xKey": "day",
                                "drillKey": "created_date",
                                "areas": [{"key": "count", "color": "#3B82F6"}],
                                "xLabel": "Date",
                                "yLabel": "Reviews",
                                "isDate": True,
                                "height": 320,
                                "margin": {"top": 20, "right": 10, "left": 20, "bottom": 30}
                            },
                            "title": "Daily Trend",
                            "tooltip": "Reviews over time",
                            "icon": "bi-graph-up"
                        })
                    
                    # Platform Distribution Chart
                    if platform_distribution:
                        charts.append({
                            "id": "platform_distribution",
                            "type": "bar",
                            "data": platform_distribution,
                            "config": {
                                "xKey": "platform",
                                "yKey": "count",
                                "drillKey": "platform",
                                "layout": "vertical",
                                "color": "#3B82F6",
                                "xLabel": "Count",
                                "yLabel": "Platform",
                                "height": 320,
                                "margin": {"top": 20, "right": 10, "left": 20, "bottom": 30}
                            },
                            "title": "Platform Distribution",
                            "tooltip": "Reviews by platform",
                            "icon": "bi-phone"
                        })
                    
                    # Sentiment Distribution Chart
                    if sentiment_distribution:
                        sentiment_colors = {
                            "positive": "#10b95d",
                            "neutral": "#767676",
                            "negative": "#f65656"
                        }
                        
                        charts.append({
                            "id": "sentiment_distribution",
                            "type": "pie",
                            "data": sentiment_distribution,
                            "config": {
                                "xKey": "name",
                                "yKey": "value",
                                "drillKey": "sentiment",
                                "height": 280,
                                "color": sentiment_colors,
                                "showLegend": True,
                                "showLabels": True,
                                "innerRadius": 0,
                                "outerRadius": 100
                            },
                            "title": "Sentiment Distribution",
                            "tooltip": "Sentiment split of filtered reviews",
                            "icon": "bi-pie-chart"
                        })
                    
                    print(f"\n===== DRILLDOWN RESPONSE =====")
                    print(f"Drill Key: {drill_key}, Drill Value: {drill_value}")
                    print(f"Total Reviews (filtered): {cards['total_reviews']}")
                    print(f"Percentage of total: {cards['percentage_of_total']}%")
                    print(f"Reviews returned: {len(reviews)}")
                    print(f"Word cloud words: {len(wordcloud)}")
                    print(f"Charts built: {len(charts)}")
                    print(f"  - Daily Trend: {'✓' if daily_trend and drill_key != 'text' else '⊘'}")
                    print(f"  - Platform Distribution: {'✓' if platform_distribution else '✗'}")
                    print(f"  - Sentiment Distribution: {'✓' if sentiment_distribution else '✗'}")
                    print(f"Final SQL WHERE: {drill_where_clause}")
                    print(f"Final SQL Params: {drill_filter_params}")
                    print("==============================\n")
                    
                    return Response({
                        "cards": cards,
                        "charts": charts,
                        "wordcloud": wordcloud,
                        "reviews": reviews,
                        "context": {
                            "key": drill_key,
                            "value": drill_value,
                            "type": "drilldown"
                        }
                    })

                # =============== FOR REVIEW REQUESTS - ONLY RETURN REVIEWS ===============
                elif is_review_request:
                    
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
                    top_words = 200
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

                    # Stopwords set (same as drilldown)
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

                    # Filter words
                    if word_counter:
                        filtered_words = {
                            word: count
                            for word, count in word_counter.items()
                            if word not in stopwords and len(word) > 3 and not word.isdigit()
                        }
                        
                        # Normalize values
                        if filtered_words:
                            max_val = max(filtered_words.values())
                            if max_val > 0:
                                top_words = {
                                    word: int((count / max_val) * 100)
                                    for word, count in sorted(filtered_words.items(), key=lambda x: x[1], reverse=True)[:200]
                                }
                            else:
                                top_words = {}
                        else:
                            top_words = {}
                    else:
                        top_words = {}

                    # Top 10 hashtags
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

                    # =============== BUILD CHARTS ===============
                    charts = []

                    # 1️⃣ Daily Sentiment → STACKED BAR
                    if daily_sentiment:
                        charts.append(build_chart(
                            chart_id="daily_sentiment",
                            chart_type="stackedbar",
                            data=daily_sentiment,
                            x_key="day",
                            y_key="value",
                            drill_key="sentiment",
                            title="Daily Sentiment",
                            tooltip="Sentiment distribution per day",
                            icon="bi-bar-chart-fill",
                            layout="horizontal",
                            series=[
                                {"key": "positive", "name": "Positive", "color": "#10b95d"},
                                {"key": "neutral", "name": "Neutral", "color": "#767676"},
                                {"key": "negative", "name": "Negative", "color": "#f65656"},
                            ],
                            is_date=True,
                            height=350,
                            x_label="Date",
                            y_label="Count"
                        ))

                    # 2️⃣ Rating Distribution → BAR
                    if rating_distribution:
                        charts.append(build_chart(
                            chart_id="rating_distribution",
                            chart_type="bar",
                            data=rating_distribution,
                            x_key="rating",
                            y_key="count",
                            title="Rating Distribution",
                            tooltip="Distribution of user ratings",
                            icon="bi-star-fill",
                            layout="horizontal",
                            color="#F59E0B",
                            height=320,
                            x_label="Ratings",
                            y_label="Count",
                            margin={"top": 30, "right": 0, "left": 20, "bottom": 14}
                        ))

                    # 3️⃣ Sentiment Score Trend → AREA
                    if sentiment_score_trend:
                        charts.append(build_chart(
                            chart_id="sentiment_score_trend",
                            chart_type="area",
                            data=sentiment_score_trend,
                            x_key="day",
                            y_key="score",
                            title="Sentiment Score Trend",
                            tooltip="Average sentiment score over time",
                            icon="bi-activity",
                            color="#3B82F6",
                            is_date=True,
                            height=320,
                            x_label="Date",
                            y_label="Scores",
                            margin={"top": 30, "right": 0, "left": 20, "bottom": 14}
                        ))

                    # 4️⃣ Language Distribution → BAR
                    if language_distribution:
                        charts.append(build_chart(
                            chart_id="language_distribution",
                            chart_type="bar",
                            data=language_distribution,
                            x_key="name",
                            y_key="value",
                            title="Language Distribution",
                            tooltip="Distribution by language",
                            icon="bi-globe",
                            color="#8B5CF6",
                            layout="horizontal",
                            height=300,
                            x_label="Languages",
                            y_label="Count",
                            margin={"top": 30, "right": 0, "left": 18, "bottom": 13}
                        ))

                    # 5️⃣ Gender Distribution → PIE
                    if gender_distribution:
                        charts.append(build_chart(
                            chart_id="gender_distribution",
                            chart_type="pie",
                            data=gender_distribution,
                            x_key="name",
                            y_key="value",
                            drill_key="gender",
                            title="Gender Distribution",
                            tooltip="User gender split",
                            icon="bi-people",
                            color={
                                "male": "#3B82F6",
                                "female": "#EC4899"
                            },
                            height=280
                        ))

                    # 6️⃣ Activity by Hour → BAR
                    if activity_by_hour:
                        charts.append(build_chart(
                            chart_id="activity_by_hour",
                            chart_type="bar",
                            data=activity_by_hour,
                            x_key="hour",
                            y_key="count",
                            title="Activity by Hour",
                            tooltip="User activity by time of day",
                            icon="bi-clock",
                            color="#6366F1",
                            layout="horizontal",
                            height=350,
                            x_label="Hours",
                            y_label="Count",
                            margin={"top": 30, "right": 0, "left": 20, "bottom": 15}
                        ))

                    # 7️⃣ Activity by Day → BAR
                    if activity_by_day:
                        charts.append(build_chart(
                            chart_id="activity_by_day",
                            chart_type="bar",
                            data=activity_by_day,
                            x_key="day",
                            y_key="count",
                            title="Activity by Day",
                            tooltip="User activity by day of week",
                            icon="bi-calendar",
                            color="#10B981",
                            layout="horizontal",
                            height=350,
                            x_label="Weeks",
                            y_label="Count"
                        ))

                    # 8️⃣ Primary Mentions → TREEMAP
                    if primary_mentions:
                        charts.append(build_chart(
                            chart_id="primary_mentions",
                            chart_type="treemap",
                            data=primary_mentions,
                            x_key="name",
                            y_key="value",
                            title="Primary Mentions",
                            drill_key="primary_mention",
                            tooltip="Top mentioned topics",
                            icon="bi-diagram-3",
                            color=[
                                '#9F8FFF', '#60A5FA', '#9CA3AF', '#F87171',
                                '#4ADE80', '#FBBF24', '#8B5CF6', '#EC4899',
                                '#14B8A6', '#FB923C', '#22C55E',
                                '#6366F1', '#DB2777', '#7C3AED', '#06B6D4'
                            ],
                            height=350
                        ))

                    # 9️⃣ Issue Type → BAR (VERTICAL)
                    if issue_type_distribution:
                        charts.append(build_chart(
                            chart_id="issue_type",
                            chart_type="bar",
                            data=issue_type_distribution,
                            x_key="name",
                            y_key="value",
                            title="Issue Type Distribution",
                            tooltip="Types of issues reported",
                            icon="bi-exclamation-triangle",
                            drill_key="issue_type",
                            layout="vertical",
                            color="#EF4444",
                            height=350,
                            x_label="Count",
                            y_label="Issues",
                            margin={"top": 10, "right": 0, "left": 30, "bottom": 10}
                        ))

                    # 🔟 Journey Sentiment → STACKED BAR
                    if journey_sentiment:
                        charts.append(build_chart(
                            chart_id="journey_sentiment",
                            chart_type="stackedbar",
                            data=journey_sentiment,
                            x_key="stage",
                            y_key="value",
                            title="Journey Stage vs Sentiment",
                            tooltip="Sentiment distribution by journey stage",
                            icon="bi-map",
                            layout="horizontal",
                            series=[
                                {"key": "positive", "name": "Positive", "color": "#10b95d"},
                                {"key": "neutral", "name": "Neutral", "color": "#767676"},
                                {"key": "negative", "name": "Negative", "color": "#f65656"},
                            ],
                            height=300,
                            x_label="Journey Stage",
                            y_label="Count",
                            margin={"top": 30, "right": 0, "left": 20, "bottom": 14}
                        ))

                    # 1️⃣1️⃣ Resolution Status → BAR
                    if resolution_status:
                        charts.append(build_chart(
                            chart_id="resolution_status",
                            chart_type="bar",
                            data=resolution_status,
                            x_key="name",
                            y_key="value",
                            title="Resolution Status",
                            tooltip="Current resolution status",
                            icon="bi-check-circle",
                            layout="horizontal",
                            drill_key="resolution_status",
                            height=300,
                            x_label="Resolution Status",
                            y_label="Count",
                            margin={"top": 30, "right": 0, "left": 20, "bottom": 14},
                            color={
                                "resolved": "#10b95d",
                                "pending": "#3B82F6",
                                "unresolved": "#f65656",
                                "partially_resolved": "#767676",
                                "not_applicable": "#9ca3af"
                            },
                        ))

                    # 1️⃣2️⃣ Value for Money → BAR
                    if value_for_money:
                        charts.append(build_chart(
                            chart_id="value_for_money",
                            chart_type="bar",
                            data=value_for_money,
                            x_key="name",
                            y_key="value",
                            title="Value for Money",
                            drill_key="value_for_money",
                            tooltip="Perceived value assessment",
                            icon="bi-cash",
                            layout="horizontal",
                            color={
                                "very_poor": "#f65656",
                                "poor": "#f97316",
                                "fair": "#eab308",
                                "good": "#10b95d",
                                "excellent": "#16a34a",
                                "not_applicable": "#767676",
                            },
                            height=300,
                            x_label="Values",
                            y_label="Count",
                            margin={"top": 30, "right": 0, "left": 20, "bottom": 14}
                        ))

                    # 1️⃣3️⃣ Churn Risk → PIE
                    if churn_risk:
                        charts.append(build_chart(
                            chart_id="churn_risk",
                            chart_type="pie",
                            data=churn_risk,
                            x_key="name",
                            y_key="value",
                            drill_key="churn_risk",
                            title="Churn Risk",
                            tooltip="Customer churn risk levels",
                            icon="bi-exclamation-circle",
                            color={
                                "high": "#f65656",
                                "medium": "#eab308",
                                "low": "#10b95d",
                                "not_applicable": "#9ca3af",
                            },
                            height=280
                        ))

                    # Prepare top advocates/detractors for frontend
                    top_advocates_data = top_advocates if top_advocates else []
                    top_detractors_data = top_detractors if top_detractors else []

                    print(f"\n===== DASHBOARD RESPONSE =====")
                    print(f"Cards: {cards}")
                    print(f"Charts built: {len(charts)}")
                    print(f"Word cloud words: {len(top_words)}")
                    print(f"Hashtags: {len(top_hashtags)}")
                    print("==============================\n")

                    return Response({
                        "cards": cards,
                        "charts": charts,
                        "wordcloud": top_words,
                        "top_hashtags": top_hashtags,
                        "top_advocates": top_advocates_data,
                        "top_detractors": top_detractors_data,
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











 