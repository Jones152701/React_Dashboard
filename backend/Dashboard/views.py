from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from datetime import datetime, timedelta
from .chart_builder import build_chart
from .word_cloud import  generate_wordcloud
import markdown
import logging
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from concurrent.futures import ThreadPoolExecutor, as_completed
import re
from collections import Counter
import math



logger = logging.getLogger(__name__)

# class IsAdminUserGroup(BasePermission):
#     def has_permission(self, request, view):
#         return request.user.groups.filter(name="admin_user").exists()


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access = response.data.get("access")
            refresh = response.data.get("refresh")

            # Set cookies
            response.set_cookie(
                key="access_token",
                value=access,
                httponly=True,
                secure=True, 
                samesite="None"
            )

            response.set_cookie(
                key="refresh_token",
                value=refresh,
                httponly=True,
                secure=True,
                samesite="None"
            )

        return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def protected_view(request):
    return Response({"message": "You are authenticated"})



@api_view(["POST"])
def logout_view(request):
    response = Response({"message": "Logged out"})

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return response



# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def user_info(request):
#     groups = list(request.user.groups.values_list("name", flat=True))
#     return Response({
#         "username": request.user.username,
#         "groups": groups
#     })

class LensAnalyticsView(APIView):
    
    # permission_classes = [IsAuthenticated, IsAdminUserGroup]

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
            top_users_chart = build_chart(
                chart_id="top_users",
                chart_type="bar",
                data=top_users_data,
                x_key="name",
                y_key="value",  
                title="Top 20 Users",
                tooltip="Users who used Lens",
                icon="bi-bar-chart-fill",
                layout="horizontal",
                color="#7B61FF",
                margin={"top": 25, "right": 10, "left": 30, "bottom": 30},
                x_label_offset=-19,
                y_label_offset=-10,
                x_label="dates",
                y_label="Values"
            )
        else:
            top_users_chart = None
            print("⚠️ No top users data available")

        
        if daily_data:
            # ✅ FIXED: Use y_key and area chart type
            daily_count_chart = build_chart(
                chart_id="daily_count",
                chart_type="area", 
                data=daily_data,
                x_key="date",
                y_key="value",  
                title="Daily Usage Trend",
                tooltip="Messages per day",
                icon="bi-graph-up",
                color="#3B82F6",
                margin={"top": 25, "right": 10, "left": 30, "bottom": 30},
                x_label_offset=-19,
                y_label_offset=-15,
                is_date=True  
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






def fix_markdown_tables(text: str) -> str:
    """
    Fix malformed markdown tables by ensuring proper formatting.
    
    This function:
    1. Detects table rows (lines containing |)
    2. Ensures proper spacing around pipes
    3. Fixes separator rows (|---|)
    4. Handles inconsistent column counts
    """
    if not text or "|" not in text:
        return text
    
    lines = text.split("\n")
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        if "|" in line:
            # Split by pipe and clean up
            cols = [c.strip() for c in line.split("|")]
            # Remove empty first/last elements from leading/trailing pipes
            if cols and cols[0] == '':
                cols = cols[1:]
            if cols and cols[-1] == '':
                cols = cols[:-1]
            
            # Check if this is a header row (next line is a separator)
            if i + 1 < len(lines) and "|" in lines[i + 1]:
                next_line = lines[i + 1]
                # Check if next line is a separator (contains only |, -, :, spaces)
                next_clean = next_line.replace("|", "").replace("-", "").replace(":", "").replace(" ", "")
                if not next_clean:  # It's a separator row
                    # Fix separator row
                    fixed_sep_parts = []
                    for col in cols:
                        # Check if alignment is specified in original separator
                        orig_sep_parts = [p.strip() for p in next_line.split("|") if p.strip()]
                        if len(orig_sep_parts) > len(fixed_sep_parts):
                            orig_sep = orig_sep_parts[len(fixed_sep_parts)]
                            if orig_sep.startswith(":") and orig_sep.endswith(":"):
                                fixed_sep_parts.append(":---:")
                            elif orig_sep.startswith(":"):
                                fixed_sep_parts.append(":---")
                            elif orig_sep.endswith(":"):
                                fixed_sep_parts.append("---:")
                            else:
                                fixed_sep_parts.append("---")
                        else:
                            fixed_sep_parts.append("---")
                    
                    fixed_lines.append("| " + " | ".join(cols) + " |")
                    fixed_lines.append("| " + " | ".join(fixed_sep_parts) + " |")
                    i += 2  # Skip both header and separator rows
                    continue
            
            # Regular table row
            fixed_lines.append("| " + " | ".join(cols) + " |")
        else:
            fixed_lines.append(line)
        
        i += 1
    
    return "\n".join(fixed_lines)


class LensFeedbackView(APIView):

    def get(self, request):

        # ✅ Initialize Markdown instance with extensions
        md = markdown.Markdown(extensions=[
            'extra',
            'codehilite',
            'tables',
            'toc',
            'nl2br',
            'sane_lists',
        ])

        table = "lens_src.prod_lens_feedback_table"

        # ===================== FILTERS =====================
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")
        selected_user = request.GET.get("user")

        # Default: last 30 days
        if not from_date or not to_date:
            current_to = datetime.now()
            current_from = current_to - timedelta(days=30)
            from_date = current_from.strftime("%Y-%m-%d")
            to_date = current_to.strftime("%Y-%m-%d")

        print("\n===== Lens Feedback Request =====")
        print(f"From: {from_date}, To: {to_date}")
        print(f"Requested User: {selected_user if selected_user else 'None'}")
        print("=================================\n")

        try:

            # ===================== QUERIES =====================

            # 1️⃣ Total Feedback Breakdown
            total_feedback_query = f"""
                SELECT 
                    COALESCE(LOWER(feedback_type), 'no_response') as feedback_type,
                    COUNT(*) as count
                FROM {table}
                WHERE created_at >= %s AND created_at < %s
                GROUP BY feedback_type
            """

            # 2️⃣ User Feedback Breakdown (Stacked)
            user_feedback_query = f"""
                SELECT 
                    user_name,
                    SUM(CASE WHEN LOWER(feedback_type) = 'like' THEN 1 ELSE 0 END) as like_count,
                    SUM(CASE WHEN LOWER(feedback_type) = 'dislike' THEN 1 ELSE 0 END) as dislike_count
                FROM {table}
                WHERE created_at >= %s AND created_at < %s
                GROUP BY user_name
                ORDER BY user_name
            """

            # 3️⃣ Users list (dropdown)
            users_query = f"""
                SELECT DISTINCT user_name
                FROM {table}
                WHERE created_at >= %s 
                AND created_at < %s
                AND LOWER(feedback_type) IN ('like', 'dislike')
                AND user_name IS NOT NULL
                AND user_name != ''
                ORDER BY user_name
            """

            # 4️⃣ Selected user breakdown
            user_detail_query = f"""
                SELECT 
                    SUM(CASE WHEN LOWER(feedback_type) = 'like' THEN 1 ELSE 0 END) as like_count,
                    SUM(CASE WHEN LOWER(feedback_type) = 'dislike' THEN 1 ELSE 0 END) as dislike_count
                FROM {table}
                WHERE created_at >= %s AND created_at < %s
                AND user_name = %s
            """

            # 5️⃣ Feedback comments with ALL fields
            comments_query = f"""
                SELECT user_name, user_question, bot_response, feedback_comment, created_at, feedback_type
                FROM {table}
                WHERE created_at >= %s 
                AND created_at < %s
                AND user_name = %s
                AND LOWER(feedback_type) IN ('like', 'dislike')
                ORDER BY created_at DESC
            """

            # ===================== STEP 1: RUN BASE QUERIES =====================
            base_queries = {
                "total_feedback": (total_feedback_query, [from_date, to_date]),
                "user_feedback": (user_feedback_query, [from_date, to_date]),
                "users": (users_query, [from_date, to_date]),
            }

            base_results = {}
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_map = {
                    executor.submit(run_query, q, p): name
                    for name, (q, p) in base_queries.items()
                }

                for future in as_completed(future_map):
                    name = future_map[future]
                    try:
                        base_results[name] = future.result()
                    except Exception as e:
                        print(f"❌ Base query failed ({name}): {e}")
                        base_results[name] = []

            # ===================== STEP 2: SET DEFAULT USER =====================
            users = [row[0] for row in base_results.get("users", []) if row[0]]
            
            if not selected_user and users:
                selected_user = users[0]
                print(f"🎯 Auto-selected default user: {selected_user}")

            # ===================== STEP 3: RUN USER-SPECIFIC QUERIES =====================
            user_results = {}
            if selected_user:
                print(f"📊 Fetching data for user: {selected_user}")
                
                user_queries = {
                    "user_detail": (user_detail_query, [from_date, to_date, selected_user]),
                    "comments": (comments_query, [from_date, to_date, selected_user]),
                }
                
                with ThreadPoolExecutor(max_workers=2) as executor:
                    future_map = {
                        executor.submit(run_query, q, p): name
                        for name, (q, p) in user_queries.items()
                    }

                    for future in as_completed(future_map):
                        name = future_map[future]
                        try:
                            user_results[name] = future.result()
                        except Exception as e:
                            print(f"❌ User query failed ({name}): {e}")
                            user_results[name] = []

            # ===================== STEP 4: TRANSFORM DATA =====================

            # 🔹 Total Feedback
            total_feedback_data = [
                {
                    "type": row[0] if row[0] else "no_response",
                    "count": row[1]
                }
                for row in base_results.get("total_feedback", [])
            ]

            feedback_map = {item["type"]: item["count"] for item in total_feedback_data}
            for key in ["like", "dislike", "no_response"]:
                if key not in feedback_map:
                    total_feedback_data.append({"type": key, "count": 0})

            # 🔹 User Feedback
            user_feedback_data = [
                {
                    "user_name": row[0] if row[0] else "Unknown",
                    "like": row[1] or 0,
                    "dislike": row[2] or 0
                }
                for row in base_results.get("user_feedback", [])
            ]

            user_feedback_data = sorted(
                user_feedback_data,
                key=lambda x: (x["like"] + x["dislike"]),
                reverse=True
            )[:15]

            # 🔹 User detail chart
            user_detail_chart = None
            if selected_user and user_results.get("user_detail") and user_results["user_detail"]:
                row = user_results["user_detail"][0]
                
                user_detail_chart = build_chart(
                    chart_id="user_feedback_detail",
                    chart_type="pie",
                    data=[
                        {"type": "like", "count": row[0] or 0},
                        {"type": "dislike", "count": row[1] or 0},
                    ],
                    x_key="type",
                    y_key="count",
                    title=f"{selected_user} - Feedback Breakdown",
                    tooltip="User feedback distribution",
                    icon="bi-person",
                    color={
                        "like": "#10b95d",
                        "dislike": "#f65656",
                    },
                    height=300,
                    layout='horizontal',
                    x_label="Feedback Type",
                    y_label="Count"
                )

            # 🔹 Comments with Markdown conversion for bot_response
            comments = []
            if selected_user and user_results.get("comments"):
                for row in user_results["comments"]:
                    
                    # Get raw bot response
                    bot_response_raw = row[2] if row[2] else "No bot response"
                    
                    # ✅ FIX TABLE FORMAT - Sanitize malformed tables
                    bot_response_fixed = fix_markdown_tables(bot_response_raw)
                    
                    # ✅ Convert markdown to HTML
                    md.reset()  # Reset markdown instance for each conversion
                    bot_response_html = md.convert(bot_response_fixed)
                    
                    comments.append({
                        "user": row[0],  # user_name
                        "comment": row[1] if row[1] else "No question provided",  # user_question
                        "bot_response": bot_response_raw,  # Keep raw markdown (optional)
                        "bot_response_html": bot_response_html,  # ✅ HTML version for rendering
                        "feedback_comment": row[3] if row[3] else "No feedback comment",  # feedback_comment
                        "date": row[4].strftime("%Y-%m-%d %H:%M:%S") if row[4] else None,
                        "type": (row[5] or "").lower(),
                    })

            # ===================== STEP 5: BUILD CHARTS =====================

            charts = []

            if total_feedback_data:
                charts.append(build_chart(
                    chart_id="total_feedback_breakdown",
                    chart_type="bar",
                    data=total_feedback_data,
                    x_key="type",
                    y_key="count",
                    title="Total Feedback Breakdown",
                    tooltip="Distribution of feedback",
                    icon="bi-bar-chart",
                    color={
                        "like": "#10b95d",
                        "dislike": "#f65656",
                        "no_response": "#9ca3af"
                    },
                    height=300,
                    layout='horizontal',
                    x_label="Feedback Type",
                    y_label="Count"
                ))

            if user_feedback_data:
                charts.append(build_chart(
                    chart_id="user_feedback_breakdown",
                    chart_type="stackedbar",
                    data=user_feedback_data,
                    x_key="user_name",
                    y_key="value",
                    title="User Feedback Breakdown",
                    tooltip="Like vs Dislike per user",
                    icon="bi-people",
                    layout="horizontal",
                    series=[
                        {"key": "like", "name": "Like", "color": "#10b95d"},
                        {"key": "dislike", "name": "Dislike", "color": "#f65656"},
                    ],
                    height=300,
                    x_label="Users",
                    y_label="Count"
                ))

            if user_detail_chart:
                charts.append(user_detail_chart)

            print("\n===== Lens Feedback Response =====")
            print(f"Total Feedback Rows: {len(total_feedback_data)}")
            print(f"User Feedback Rows: {len(user_feedback_data)}")
            print(f"Users Available: {len(users)}")
            print(f"Selected User: {selected_user if selected_user else 'None'}")
            print(f"Comments Retrieved: {len(comments)}")
            if comments:
                print(f"Sample bot_response_html length: {len(comments[0].get('bot_response_html', ''))}")
            print(f"Charts Built: {len(charts)}")
            print("=================================\n")

            return Response({
                "charts": charts,
                "users": users,
                "comments": comments,
                "selected_user": selected_user
            })

        except Exception as e:
            print(f"❌ ERROR in LensFeedbackView: {str(e)}")
            import traceback
            traceback.print_exc()

            return Response(
                {
                    "error": "Failed to fetch lens feedback data",
                    "detail": str(e)
                },
                status=500
            )



def run_query(query, params):
    """Execute a SQL query in its own DB connection (thread-safe)."""
    from django.db import connections
    conn = connections['default']
    with conn.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchall()



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
        drill_key2 = request.GET.get("drill_key2", "")    # ✅ Secondary drill key (for stacked bar x-axis)
        drill_value2 = request.GET.get("drill_value2", "") # ✅ Secondary drill value

        # ✅ ADD THIS BLOCK HERE
        INVALID_DRILL_KEYS = ["total_reviews", "avg_rating"]

        if drill_key in INVALID_DRILL_KEYS:
            print(f"⚠️ Ignoring invalid drill key: {drill_key}")
            drill_key = None
            drill_value = None
        
        if drill_key2 in INVALID_DRILL_KEYS:
            print(f"⚠️ Ignoring invalid secondary drill key: {drill_key2}")
            drill_key2 = None
            drill_value2 = None

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
            if drill_key2:
                print(f"Drill Key2: {drill_key2}")
                print(f"Drill Value2: {drill_value2}")
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
                    
                    # ✅ HELPER FUNCTION FOR HOUR CONVERSION
                    def convert_hour_format(hour_str):
                        """Convert '12 PM' or '3 AM' to integer hour (0-23)"""
                        try:
                            # Clean up the string
                            hour_str = str(hour_str).strip().upper()
                            
                            # Parse using datetime
                            from datetime import datetime
                            parsed_time = datetime.strptime(hour_str, "%I %p")
                            return parsed_time.hour
                        except Exception as e:
                            print(f"⚠️ Failed to parse hour '{hour_str}': {e}")
                            return None
                    
                    # ✅ HELPER FUNCTION FOR WEEKDAY CONVERSION
                    def convert_weekday_format(weekday_str):
                        """Convert 'Monday' to 1, 'Tuesday' to 2, etc. (PostgreSQL: Sunday=0, Monday=1)"""
                        day_map = {
                            "monday": 1,
                            "tuesday": 2,
                            "wednesday": 3,
                            "thursday": 4,
                            "friday": 5,
                            "saturday": 6,
                            "sunday": 0
                        }
                        
                        weekday_str = str(weekday_str).strip().lower()
                        return day_map.get(weekday_str)
                    
                    # ✅ PRODUCTION-GRADE COLUMN MAP WITH TYPE INFORMATION
                    COLUMN_MAP = {
                        # String fields (use LOWER() for case-insensitive matching)
                        "platform": ("platform", "string"),
                        "country": ("country", "string"),
                        "sentiment": ("sentiment", "string"),
                        "segment": ("sentiment", "string"),
                        "text": ("message", "string"),
                        "hour": ("created_date", "hour"),
                        "day": ("created_date", "weekday"), 
                        "date": ("created_date", "date"),
                        "created_date": ("created_date", "date"),
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
                        "advocate": ("username", "string"),
                        "detractor": ("username", "string"),
                        "hashtag": ("message", "hashtag"),
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
                            
                            # ✅ Handle hour type (derived from EXTRACT)
                            elif col_type == "hour":
                                # Convert "12 PM" to 12, "3 AM" to 3, etc.
                                hour_int = convert_hour_format(drill_value)
                                
                                if hour_int is not None:
                                    filter_condition = f"EXTRACT(HOUR FROM {db_column}) = %s"
                                    filter_value = hour_int
                                    print(f"✅ Applied hour filter: EXTRACT(HOUR FROM {db_column}) = {hour_int} (from '{drill_value}')")
                                else:
                                    print(f"⚠️ Could not parse hour value: {drill_value}, skipping filter")
                                    filter_condition = None
                            
                            # ✅ NEW: Handle weekday type (derived from EXTRACT(DOW))
                            elif col_type == "weekday":
                                # Convert "Monday" to 1, "Tuesday" to 2, etc.
                                day_num = convert_weekday_format(drill_value)
                                
                                if day_num is not None:
                                    filter_condition = f"EXTRACT(DOW FROM {db_column}) = %s"
                                    filter_value = day_num
                                    print(f"✅ Applied weekday filter: {drill_value} → {day_num}")
                                else:
                                    print(f"⚠️ Could not parse weekday value: {drill_value}, skipping filter")
                                    filter_condition = None
                                    
                            else:  # string type
                                # Handle text/word cloud with LIKE instead of exact match
                                value = str(drill_value).lower()
                                
                                # Special handling for text/word cloud drilldown
                                if drill_key == "text":
                                    value = str(drill_value).lower().strip()

                                    filter_condition = f"LOWER({db_column}) LIKE %s"
                                    filter_value = f"%{value}%"

                                    print(f"✅ Applied word filter: {value}")
                                elif col_type == "hashtag":
                                    value = str(drill_value).lower().strip()

                                    if not value.startswith("#"):
                                        value = f"#{value}"

                                    filter_condition = f"{db_column} ~* %s"
                                    filter_value = rf"(^|\s){re.escape(value)}(\s|$)"

                                    print(f"✅ Applied hashtag filter: {value}")
                                else:
                                    filter_condition = f"LOWER({db_column}) = %s"
                                    filter_value = value
                                    print(f"✅ Applied string filter: LOWER({db_column}) = '{value}'")
                            
                            # ✅ CRITICAL FIX: Rebuild filters and params together
                            # ✅ CRITICAL FIX: Rebuild filters and params together
                            if filter_condition:
                                new_filters = []
                                new_params = []
                                param_idx = 0  # Track position in flat params list

                                for f in drill_filters:
                                    # Count how many %s placeholders this filter consumes
                                    num_placeholders = f.count('%s')
                                    these_params = drill_filter_params[param_idx: param_idx + num_placeholders]
                                    param_idx += num_placeholders

                                    # Decide whether to keep or drop this filter
                                    should_exclude = False
                                    if col_type == "hour" and "EXTRACT(HOUR" in f:
                                        should_exclude = True
                                    elif col_type == "weekday" and "EXTRACT(DOW" in f:
                                        should_exclude = True
                                    elif col_type not in ("hour", "weekday") and db_column in f:
                                        should_exclude = True

                                    if not should_exclude:
                                        new_filters.append(f)
                                        new_params.extend(these_params)  # ✅ extend, not append — preserves multi-param filters

                                removed_count = len(drill_filters) - len(new_filters)
                                if removed_count > 0:
                                    print(f"🔄 Removed {removed_count} existing filter(s) for column '{db_column}'")

                                # Replace with cleaned lists
                                drill_filters = new_filters
                                drill_filter_params = new_params

                                # Add the new drill filter and its single param
                                drill_filters.append(filter_condition)
                                drill_filter_params.append(filter_value)
                                print(f"✅ Added new filter: {filter_condition}")
                       

                        except Exception as e:
                            print(f"❌ Error applying drill filter: {e}")
                            import traceback
                            traceback.print_exc()
                    
                  
                    if drill_key2 and drill_value2:
                        db_column2, col_type2 = COLUMN_MAP.get(drill_key2, (drill_key2, "string"))
                        
                        print(f"🔍 Secondary Drill - Key: {drill_key2}, Value: {drill_value2}, Column: {db_column2}, Type: {col_type2}")
                        
                        try:
                            filter_condition2 = None
                            filter_value2 = None
                            
                            if col_type2 == "number":
                                filter_condition2 = f"{db_column2} = %s"
                                filter_value2 = int(drill_value2)
                            elif col_type2 == "date":
                                if is_valid_date(drill_value2):
                                    filter_condition2 = f"DATE({db_column2}) = %s"
                                    filter_value2 = drill_value2
                                else:
                                    print(f"⚠️ Invalid date format for secondary filter: {drill_value2}")
                            elif col_type2 == "hour":
                                hour_int2 = convert_hour_format(drill_value2)
                                if hour_int2 is not None:
                                    filter_condition2 = f"EXTRACT(HOUR FROM {db_column2}) = %s"
                                    filter_value2 = hour_int2
                            elif col_type2 == "weekday":
                                day_num2 = convert_weekday_format(drill_value2)
                                if day_num2 is not None:
                                    filter_condition2 = f"EXTRACT(DOW FROM {db_column2}) = %s"
                                    filter_value2 = day_num2
                            else:  # string
                                filter_condition2 = f"LOWER({db_column2}) = %s"
                                filter_value2 = str(drill_value2).lower()
                            
                            if filter_condition2 and filter_value2 is not None:
                                drill_filters.append(filter_condition2)
                                drill_filter_params.append(filter_value2)
                                print(f"✅ Applied secondary filter: {filter_condition2} = {filter_value2}")
                                
                        except Exception as e:
                            print(f"❌ Error applying secondary drill filter: {e}")
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
                    
                    # =============== PREPARE ALL DRILLDOWN QUERIES ===============
                    queries = {}
                    
                    # 1. KPI CARDS
                    kpi_query = f"""
                        SELECT
                            COUNT(*) as total_reviews,
                            AVG(user_rating) as avg_rating,
                            AVG(sentiment_score) as avg_sentiment
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """
                    queries['kpi'] = (kpi_query, drill_params)
                    
                    # 2. Total for percentage calculation
                    total_query = f"""
                        SELECT COUNT(*)
                        FROM {table}
                        WHERE created_date >= %s AND created_date < %s
                    """
                    queries['total'] = (total_query, [current_from_str, current_to_str])
                    
                    # 3. DAILY TREND
                    if drill_key not in ["text", "hour", "day"]:
                        trend_query = f"""
                            SELECT DATE(created_date) as day, COUNT(*) as count
                            FROM {table}
                            {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                            GROUP BY DATE(created_date)
                            ORDER BY day
                        """
                        queries['trend'] = (trend_query, drill_params)
                    
                    # 4. PLATFORM DISTRIBUTION
                    platform_query = f"""
                        SELECT platform, COUNT(*) as count
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY platform
                        ORDER BY count DESC
                    """
                    queries['platform'] = (platform_query, drill_params)
                    
                    # 5. SENTIMENT DISTRIBUTION
                    sentiment_query = f"""
                        SELECT sentiment, COUNT(*) as count
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY sentiment
                    """
                    queries['sentiment'] = (sentiment_query, drill_params)
                    
                    # 6. WORD CLOUD
                    text_query = f"""
                        SELECT message
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """
                    queries['text'] = (text_query, drill_params)
                    
                    # 7. REVIEWS LIST 
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
                        LIMIT %s OFFSET %s
                    """
                    paginated_params = drill_params.copy()
                    paginated_params.extend([limit, offset])
                    queries['reviews'] = (review_query, paginated_params)
                    
                    # 8. TOTAL COUNT FOR PAGINATION
                    count_query = f"""
                        SELECT COUNT(*)
                        FROM {table}
                        {drill_where_clause + " AND created_date >= %s AND created_date < %s" if drill_where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """
                    queries['count'] = (count_query, drill_params)
                    
                    # =============== EXECUTE QUERIES ===============
                    results = {}
                    with ThreadPoolExecutor(max_workers=8) as executor:
                        future_to_name = {
                            executor.submit(run_query, q_sql, q_params): name
                            for name, (q_sql, q_params) in queries.items()
                        }
                        for future in as_completed(future_to_name):
                            name = future_to_name[future]
                            try:
                                results[name] = future.result()
                            except Exception as exc:
                                print(f"Query {name} generated an exception: {exc}")
                                results[name] = []
                    
                    # =============== PROCESS RESULTS ===============
                    
                    # KPI Cards
                    kpi_row = results.get('kpi', [None])[0] if results.get('kpi') else None
                    total_reviews = kpi_row[0] or 0 if kpi_row else 0
                    avg_rating = float(kpi_row[1] or 0) if kpi_row and kpi_row[1] else 0
                    avg_sentiment = float(kpi_row[2] or 0) if kpi_row and kpi_row[2] else 0
                    
                    total_res = results.get('total', [[1]])
                    grand_total = total_res[0][0] or 1 if total_res and total_res[0] else 1
                    
                    percentage = round((total_reviews / grand_total) * 100, 2) if grand_total > 0 else 0
                    
                    cards = {
                        "total_reviews": total_reviews,
                        "avg_rating": round(avg_rating, 2),
                        "avg_sentiment_score": round(avg_sentiment, 3),
                        "percentage_of_total": percentage
                    }
                    print(f"📊 KPI Results - Filtered: {total_reviews}, Total: {grand_total}, Percentage: {percentage}%")
                    
                    # Daily Trend
                    daily_trend = []
                    if 'trend' in results:
                        trend_rows = results['trend']
                        daily_trend = [
                            {"day": row[0].strftime("%Y-%m-%d") if hasattr(row[0], 'strftime') else row[0], "count": row[1]}
                            for row in trend_rows
                        ]
                        print(f"📈 Daily trend rows: {len(daily_trend)}")
                    else:
                        print(f"📈 Skipping daily trend for {drill_key} drilldown")
                        
                    # Platform Distribution
                    platform_rows = results.get('platform', [])
                    platform_distribution = [
                        {"platform": row[0] or "Unknown", "count": row[1]}
                        for row in platform_rows
                    ]
                    print(f"📱 Platform distribution rows: {len(platform_distribution)}")
                    
                    # Sentiment Distribution
                    sentiment_rows = results.get('sentiment', [])
                    sentiment_distribution = [
                        {"name": row[0] or "Unknown", "value": row[1]}
                        for row in sentiment_rows
                    ]
                    print(f"🎯 Sentiment distribution rows: {len(sentiment_distribution)}")
                    
                    # Word Cloud
                    text_rows = results.get('text', [])
                    messages = [row[0] for row in text_rows if row[0] and isinstance(row[0], str)]
                    wordcloud = generate_wordcloud(messages, max_words=100)
                    print(f"📝 Word cloud words: {len(wordcloud)}")
                    
                    # Reviews List
                    review_rows = results.get('reviews', [])
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
                    print(f"📋 Reviews returned (page {page}): {len(reviews)}")
                    
                    # Total Count for Pagination
                    count_res = results.get('count', [])
                    total_reviews_count = count_res[0][0] if count_res and count_res[0] else total_reviews
                    total_pages = math.ceil(total_reviews_count / limit) if total_reviews_count > 0 else 0
                    print(f"📊 Total Reviews: {total_reviews_count}, Total Pages: {total_pages}")
                    
                    # =============== BUILD CHARTS ===============
                    charts = []
                    
                    # Daily Trend Chart (only for non-text, non-hour, non-weekday drills)
                    if daily_trend and drill_key not in ["text", "hour", "day"]:
                        charts.append(build_chart(
                            chart_id="daily_trend",
                            chart_type="area",
                            data=daily_trend,
                            x_key="day",
                            y_key="count",
                            drill_key="created_date",
                            title="Daily Trend",
                            icon="bi-graph-up",
                            color="#3B82F6",         
                            is_date=True,            
                            height=320,
                            x_label="Date",
                            y_label="Reviews",
                            margin={"top": 20, "right": 10, "left": 20, "bottom": 30}
                        ))
                    
                    # Platform Distribution Chart
                    if platform_distribution:
                       charts.append(build_chart(
                            chart_id="platform_distribution",
                            chart_type="bar",
                            data=platform_distribution,
                            x_key="platform",
                            y_key="count",
                            drill_key="platform",
                            title="Platform Distribution",
                            tooltip="Reviews by platform",
                            icon="bi-phone",
                            layout="vertical",
                            color="#3B82F6",
                            height=320,
                            x_label="Count",
                            y_label="Platform",
                            margin={"top": 20, "right": 10, "left": 20, "bottom": 30}
                        ))
                    
                    # Sentiment Distribution Chart

                    if sentiment_distribution and not drill_key2:
                        
                        charts.append(build_chart(
                            chart_id="sentiment_distribution",
                            chart_type="pie",
                            data=sentiment_distribution,
                            x_key="name",
                            y_key="value",
                            drill_key="sentiment",
                            title="Sentiment Distribution",
                            tooltip="Sentiment split of filtered reviews",
                            icon="bi-pie-chart",
                            color={
                                "positive": "#10b95d",
                                "neutral": "#767676",
                                "negative": "#f65656"
                            },
                            height=280
                        ))
                    
                    print(f"\n===== DRILLDOWN RESPONSE =====")
                    print(f"Drill Key: {drill_key}, Drill Value: {drill_value}")
                    print(f"Total Reviews (filtered): {cards['total_reviews']}")
                    print(f"Percentage of total: {cards['percentage_of_total']}%")
                    print(f"Reviews returned: {len(reviews)} (page {page} of {total_pages})")
                    print(f"Word cloud words: {len(wordcloud)}")
                    print(f"Charts built: {len(charts)}")
                    print(f"  - Daily Trend: {'✓' if daily_trend and drill_key not in ['text', 'hour', 'day'] else '⊘'}")
                    print(f"  - Platform Distribution: {'✓' if platform_distribution else '✗'}")
                    print(f"  - Sentiment Distribution: {'✓' if sentiment_distribution else '✗'}")
                    print(f"Final SQL WHERE: {drill_where_clause}")
                    print(f"Final SQL Params: {drill_filter_params}")
                    print("==============================\n")
                    
                    return Response({
                        "cards": cards,
                        "charts": charts,

                        "wordcloud": {
                            "data": wordcloud,
                            "config": {
                                "minFontSize": 12,
                                "maxFontSize": 40,
                                "padding": 0.3,

                                "colors": [
                                    "#6366F1",
                                    "#8B5CF6",
                                    "#3B82F6",
                                    "#0EA5E9",
                                    "#14B8A6"
                                ]
                            }
                        },

                        "reviews": reviews,

                        # ✅ Pagination metadata for frontend
                        "pagination": {
                            "total_reviews": total_reviews,
                            "total_pages": total_pages,
                            "current_page": page,
                            "limit": limit,
                        },

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

                    # ---------------- Total Reviews Count (Current Period) ----------------
                    count_query = f"""
                        SELECT COUNT(*)
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """

                    # ✅ FIX: Define paginated_params for reviews branch
                    paginated_params = filter_params.copy() if filter_params else []
                    paginated_params.extend([current_from_str, current_to_str, limit, offset])
                    
                    count_params = filter_params.copy() if filter_params else []
                    count_params.extend([current_from_str, current_to_str])
                    
                    # Run queries in parallel
                    with ThreadPoolExecutor(max_workers=2) as executor:
                        future_reviews = executor.submit(run_query, review_query, paginated_params)
                        future_count = executor.submit(run_query, count_query, count_params)
                        
                        review_rows = future_reviews.result()
                        count_res = future_count.result()
                        total_reviews = count_res[0][0] if count_res and count_res[0][0] else 0

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

                    # =============== PREPARE ALL DASHBOARD QUERIES ===============
                    queries = {}
                    
                    # 1. KPI Calculation
                    kpi_query = f"""
                    SELECT 
                        COUNT(CASE WHEN created_date >= %s AND created_date < %s THEN 1 END) AS current_total,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) AS current_positive,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) AS current_neutral,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) AS current_negative,
                        AVG(CASE WHEN created_date >= %s AND created_date < %s THEN user_rating END) AS current_avg,
                        COUNT(CASE WHEN created_date >= %s AND created_date < %s THEN 1 END) AS prev_total,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) AS prev_positive,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) AS prev_neutral,
                        SUM(CASE WHEN created_date >= %s AND created_date < %s AND LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) AS prev_negative,
                        AVG(CASE WHEN created_date >= %s AND created_date < %s THEN user_rating END) AS prev_avg
                    FROM {table}
                    {where_clause}
                    """
                    kpi_params = [
                        current_from_str, current_to_str, current_from_str, current_to_str,
                        current_from_str, current_to_str, current_from_str, current_to_str,
                        current_from_str, current_to_str, prev_from_str, prev_to_str,
                        prev_from_str, prev_to_str, prev_from_str, prev_to_str,
                        prev_from_str, prev_to_str, prev_from_str, prev_to_str,
                    ]
                    kpi_params.extend(filter_params)
                    queries['kpi'] = (kpi_query, kpi_params)
                    
                    # Dashboard shared params for mostly all queries
                    dashboard_params = filter_params.copy() if filter_params else []
                    dashboard_params.extend([current_from_str, current_to_str])

                    # 2. Daily Sentiment
                    sentiment_query = f"""
                        SELECT DATE(created_date) AS day,
                            SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) AS positive,
                            SUM(CASE WHEN LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) AS neutral,
                            SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) AS negative
                        FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY 1 ORDER BY 1
                    """
                    queries['sentiment'] = (sentiment_query, dashboard_params)
                    
                    # 3. Rating Distribution
                    rating_where = (
                        where_clause + f" AND user_rating IS NOT NULL AND created_date >= %s AND created_date < %s"
                        if where_clause else f"WHERE user_rating IS NOT NULL AND created_date >= %s AND created_date < %s"
                    )
                    rating_query = f"""
                        SELECT user_rating, COUNT(*) AS count
                        FROM {table} {rating_where} GROUP BY user_rating ORDER BY user_rating
                    """
                    queries['rating'] = (rating_query, dashboard_params)
                    
                    # 4. Sentiment Score Trend
                    score_where = (
                        where_clause + f" AND sentiment_score IS NOT NULL AND created_date >= %s AND created_date < %s"
                        if where_clause else f"WHERE sentiment_score IS NOT NULL AND created_date >= %s AND created_date < %s"
                    )
                    score_query = f"""
                        SELECT DATE(created_date) AS day, AVG(sentiment_score) AS score
                        FROM {table} {score_where} GROUP BY 1 ORDER BY 1
                    """
                    queries['score'] = (score_query, dashboard_params)
                    
                    # 5. Text & Hashtags
                    all_text_query = f"""
                        SELECT message FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                    """
                    full_params = filter_params.copy()
                    full_params.extend([current_from_str, current_to_str])

                    queries['text'] = (all_text_query, full_params)
                    
                    # 6. Language Distribution
                    language_query = f"""
                        SELECT LOWER(TRIM(language)) AS language, COUNT(*) AS count
                        FROM {table}
                        {where_clause + " AND language IS NOT NULL AND TRIM(language) <> '' AND LOWER(TRIM(language)) <> 'nan' AND created_date >= %s AND created_date < %s"
                        if where_clause else
                        "WHERE language IS NOT NULL AND TRIM(language) <> '' AND LOWER(TRIM(language)) <> 'nan' AND created_date >= %s AND created_date < %s"}
                        GROUP BY LOWER(TRIM(language))
                        ORDER BY count DESC
                        LIMIT 10
                    """
                    queries['language'] = (language_query, dashboard_params)
                    
                    # 7. Gender Distribution
                    gender_query = f"""
                        SELECT LOWER(TRIM(gender)) as gender, COUNT(*) as count
                        FROM {table}
                        {where_clause + " AND gender IS NOT NULL AND gender != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE gender IS NOT NULL AND gender != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY LOWER(TRIM(gender))
                    """
                    queries['gender'] = (gender_query, dashboard_params)
                    
                    # 8. Top Advocates
                    advocates_query = f"""
                        SELECT username, COUNT(*) as mentions FROM {table}
                        {where_clause + " AND LOWER(sentiment) = 'positive' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE LOWER(sentiment) = 'positive' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY username ORDER BY mentions DESC LIMIT 10
                    """
                    queries['advocates'] = (advocates_query, dashboard_params)
                    
                    # 9. Top Detractors
                    detractors_query = f"""
                        SELECT username, COUNT(*) as mentions FROM {table}
                        {where_clause + " AND LOWER(sentiment) = 'negative' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE LOWER(sentiment) = 'negative' AND username IS NOT NULL AND username != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY username ORDER BY mentions DESC LIMIT 10
                    """
                    queries['detractors'] = (detractors_query, dashboard_params)
                    
                    # 10. Activity By Hour
                    activity_hour_query = f"""
                        SELECT EXTRACT(HOUR FROM created_date) as hour, COUNT(*) as count FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY hour ORDER BY hour
                    """
                    queries['activity_hour'] = (activity_hour_query, dashboard_params)
                    
                    # 11. Activity By Day
                    activity_day_query = f"""
                        SELECT EXTRACT(DOW FROM created_date) as day, COUNT(*) as count FROM {table}
                        {where_clause + " AND created_date >= %s AND created_date < %s" if where_clause else "WHERE created_date >= %s AND created_date < %s"}
                        GROUP BY day ORDER BY day
                    """
                    queries['activity_day'] = (activity_day_query, dashboard_params)
                    
                    # 12. Primary Mentions
                    primary_mentions_query = f"""
                        SELECT primary_mention, COUNT(*) as count FROM {table}
                        {where_clause + " AND primary_mention IS NOT NULL AND primary_mention != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE primary_mention IS NOT NULL AND primary_mention != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY primary_mention ORDER BY count DESC LIMIT 20
                    """
                    queries['primary'] = (primary_mentions_query, dashboard_params)
                    
                    # 13. Issue Type
                    issue_type_query = f"""
                        SELECT issue_type, COUNT(*) as count FROM {table}
                        {where_clause + " AND issue_type IS NOT NULL AND issue_type != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE issue_type IS NOT NULL AND issue_type != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY issue_type ORDER BY count DESC
                    """
                    queries['issue'] = (issue_type_query, dashboard_params)
                    
                    # 14. Journey Sentiment
                    journey_query = f"""
                        SELECT journey_stage,
                            SUM(CASE WHEN LOWER(sentiment) = 'positive' THEN 1 ELSE 0 END) as positive,
                            SUM(CASE WHEN LOWER(sentiment) = 'neutral' THEN 1 ELSE 0 END) as neutral,
                            SUM(CASE WHEN LOWER(sentiment) = 'negative' THEN 1 ELSE 0 END) as negative
                        FROM {table}
                        {where_clause + " AND journey_stage IS NOT NULL AND journey_stage != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE journey_stage IS NOT NULL AND journey_stage != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY journey_stage ORDER BY journey_stage
                    """
                    queries['journey'] = (journey_query, dashboard_params)
                    
                    # 15. Resolution Status
                    resolution_query = f"""
                        SELECT resolution_status, COUNT(*) as count FROM {table}
                        {where_clause + " AND resolution_status IS NOT NULL AND resolution_status != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE resolution_status IS NOT NULL AND resolution_status != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY resolution_status ORDER BY count DESC
                    """
                    queries['resolution'] = (resolution_query, dashboard_params)
                    
                    # 16. Value For Money
                    value_query = f"""
                        SELECT value_for_money, COUNT(*) as count FROM {table}
                        {where_clause + " AND value_for_money IS NOT NULL AND value_for_money != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE value_for_money IS NOT NULL AND value_for_money != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY value_for_money ORDER BY count DESC
                    """
                    queries['value'] = (value_query, dashboard_params)
                    
                    # 17. Churn Risk
                    churn_query = f"""
                        SELECT churn_risk, COUNT(*) as count FROM {table}
                        {where_clause + " AND churn_risk IS NOT NULL AND churn_risk != '' AND created_date >= %s AND created_date < %s" if where_clause else "WHERE churn_risk IS NOT NULL AND churn_risk != '' AND created_date >= %s AND created_date < %s"}
                        GROUP BY churn_risk
                    """
                    queries['churn'] = (churn_query, dashboard_params)

                    # =============== EXECUTE ALL QUERIES IN PARALLEL ===============
                    results = {}
                    with ThreadPoolExecutor(max_workers=17) as executor:
                        future_to_name = {
                            executor.submit(run_query, q_sql, q_params): name
                            for name, (q_sql, q_params) in queries.items()
                        }
                        for future in as_completed(future_to_name):
                            name = future_to_name[future]
                            try:
                                results[name] = future.result()
                            except Exception as exc:
                                print(f"Query {name} generated an exception: {exc}")
                                results[name] = []

                    # =============== PROCESS RESULTS ===============
                    
                    # KPI Cards Processing
                    kpi_rows = results.get('kpi', [])
                    if kpi_rows and kpi_rows[0]:
                        kpi_row = kpi_rows[0]
                        (current_total, current_positive, current_neutral, current_negative, current_avg,
                         prev_total, prev_positive, prev_neutral, prev_negative, prev_avg) = [
                             val if val is not None else 0 for val in kpi_row
                         ]
                        
                        cards = {
                            "total_reviews_card": build_card(current_total, prev_total),
                            "positive_card": build_card(current_positive, prev_positive),
                            "neutral_card": build_card(current_neutral, prev_neutral),
                            "negative_card": build_card(current_negative, prev_negative),
                            "avg_rating_card": build_card(float(current_avg), float(prev_avg), is_rating=True)
                        }
                    else:
                        cards = {
                            "total_reviews_card": build_card(0, 0),
                            "positive_card": build_card(0, 0),
                            "neutral_card": build_card(0, 0),
                            "negative_card": build_card(0, 0),
                            "avg_rating_card": build_card(0, 0, is_rating=True)
                        }

                    # Other Result processing
                    daily_sentiment = [{"day": row[0], "positive": row[1], "neutral": row[2], "negative": row[3]} for row in results.get('sentiment', [])]
                    rating_distribution = [{"rating": row[0], "count": row[1]} for row in results.get('rating', [])]
                    sentiment_score_trend = [{"day": row[0], "score": float(row[1]) if row[1] else 0} for row in results.get('score', [])]
                    
                    hashtag_counter = Counter()
                    try:
                        messages = [row[0] for row in results.get('text', []) if row[0] and isinstance(row[0], str)]
                        for msg in messages:
                            hashtags = re.findall(r'#\w+', msg.lower())

                            cleaned_hashtags = []

                            for tag in hashtags:
                                # Remove trailing punctuation
                                cleaned = re.sub(r'[^\w#]', '', tag)
                                if cleaned.startswith('#'):
                                    cleaned_hashtags.append(cleaned)

                            hashtag_counter.update(cleaned_hashtags)
                        top_words = generate_wordcloud(messages, max_words=200)
                    except Exception as e:
                        print(f"WordCloud processing error: {str(e)}")
                        top_words = {}
                    top_hashtags = dict(hashtag_counter.most_common(10)) if hashtag_counter else {}

                    language_distribution = [{"name": row[0].title() if row[0] else "Unknown", "value": row[1]} for row in results.get('language', [])]
                    gender_distribution = [{"name": row[0].title() if row[0] else "Unknown", "value": row[1]} for row in results.get('gender', [])]
                    top_advocates = [{"username": row[0], "mentions": row[1]} for row in results.get('advocates', [])]
                    top_detractors = [{"username": row[0], "mentions": row[1]} for row in results.get('detractors', [])]

                    activity_by_hour = [{"hour": f"{int(int(row[0]) % 12 or 12)} {'AM' if int(row[0]) < 12 else 'PM'}", "count": row[1]} for row in results.get('activity_hour', [])]
                    days_map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    activity_by_day = [{"day": days_map[int(row[0])], "count": row[1]} for row in results.get('activity_day', [])]

                    primary_mentions = [{"name": row[0], "value": row[1]} for row in results.get('primary', [])]
                    issue_type_distribution = [{"name": row[0], "value": row[1]} for row in results.get('issue', [])]
                    journey_sentiment = [{"stage": row[0], "positive": row[1], "neutral": row[2], "negative": row[3]} for row in results.get('journey', [])]
                    resolution_status = [{"name": row[0], "value": row[1]} for row in results.get('resolution', [])]
                    value_for_money = [{"name": row[0], "value": row[1]} for row in results.get('value', [])]
                    churn_risk = [{"name": row[0], "value": row[1]} for row in results.get('churn', [])]

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
                            drill_key="date",
                            segment_drill_key="sentiment",
                            x_drill_key="date",
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
                            drill_key="language",
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
                            drill_key="journey_stage",
                            segment_drill_key="sentiment",
                            x_drill_key="journey_stage",
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

                        "wordcloud": {
                            "data": top_words,
                            "config": {
                                "minFontSize": 10,
                                "maxFontSize": 25,
                                "padding": 0.5,
                                "title": "Word Cloud",
                                "tooltip": "Most frequent words in reviews",
                                "icon":"bi bi-cloud-fill",

                                # ✅ NEW: color palette
                                "colors": [
                                    "#6366F1",
                                    "#8B5CF6",
                                    "#3B82F6",
                                    "#0EA5E9",
                                    "#14B8A6"
                                ]
                            }
                        },

                        "top_hashtags": {
                            "data": top_hashtags,
                            "config":{
                                 "title": "Top Hashtags",
                                 "tooltip": "Most used hastags in reviews",
                                 "icon":"bi bi-hash",
                            }
                        },
                        "top_advocates": {
                            "data": top_advocates_data,
                            "config":{
                                "title": "Top Advocates",
                                 "tooltip": "Users with most positive mentions",
                                 "icon":"bi bi-megaphone-fill text-success",
                            }
                        },
                        "top_detractors": {
                            "data":top_detractors_data,
                            "config":{
                                "title": "Top Detractors",
                                 "tooltip": "Users with most negative mentions",
                                 "icon":"bi bi-chat-left-dots-fill text-danger",
                            }
                        },
                    
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






class CompetitorsView(APIView):
    """
    API View to fetch competitors data with filters for country and competitor type.
    Returns competitors list, overall matrix as HTML, and available filters.
    """

    def get(self, request):
        try:
            country = request.GET.get("country", "all")
            competitor_type = request.GET.get("competitor_type", "all")

            table = '"lens_src"."lyca_competitor_plan_data"'
            matrix_table = '"lens_src"."lyca_competitor_overall_matrix"'

            # ===============================
            # 🔹 WHERE CLAUSE
            # ===============================
            where_clauses = []
            params = []

            if country.lower() != "all":
                where_clauses.append("LOWER(country) = LOWER(%s)")
                params.append(country)

            if competitor_type.lower() != "all":
                where_clauses.append("LOWER(competitor_type) = LOWER(%s)")
                params.append(competitor_type)

            where_sql = ""
            if where_clauses:
                where_sql = "WHERE " + " AND ".join(where_clauses)

            # ===============================
            # 🔹 COMPETITORS (CARDS)
            # ===============================
            competitors_query = f"""
                SELECT DISTINCT name, country, competitor_type
                FROM {table}
                {where_sql}
                ORDER BY name
            """

            # ===============================
            # 🔹 OVERALL MATRIX (MARKDOWN VERSION)
            # ===============================
            matrix_query = f"""
                SELECT country, competitor_type, tier, overall_matrix
                FROM {matrix_table}
                {where_sql}
                ORDER BY 
                    CASE 
                        WHEN tier = 'Lite' THEN 1
                        WHEN tier = 'Standard' THEN 2
                        WHEN tier = 'Plus' THEN 3
                        WHEN tier = 'Premium' THEN 4
                        ELSE 5
                    END,
                    country,
                    competitor_type
            """

            # ===============================
            # 🔹 FILTERS
            # ===============================
            country_query = f"""
                SELECT DISTINCT country
                FROM {table}
                ORDER BY country
            """

            type_query = f"""
                SELECT DISTINCT competitor_type
                FROM {table}
                ORDER BY competitor_type
            """

            with connection.cursor() as cursor:

                # 🔹 competitors
                cursor.execute(competitors_query, params)
                competitors = [
                    {
                        "name": row[0],
                        "country": row[1],
                        "competitor_type": row[2],
                    }
                    for row in cursor.fetchall()
                ]

                # 🔹 overall matrix - Build per-tier slides for carousel
                cursor.execute(matrix_query, params)
                matrix_rows = cursor.fetchall()

                # 🔥 Build name → competitor_type lookup (for badge injection)
                name_type_map = {}
                for comp in competitors:
                    name_type_map[comp["name"].strip().upper()] = comp["competitor_type"].strip().upper()

                # 🔥 Group markdown by (tier + competitor_type)
                from collections import OrderedDict
                tier_type_markdown = OrderedDict()

                for row in matrix_rows:
                    comp_type = row[1] or "Other"  # competitor_type column
                    tier = row[2] or "Other"
                    matrix_text = row[3] or ""

                    key = (tier, comp_type.upper())
                    if key not in tier_type_markdown:
                        tier_type_markdown[key] = ""
                    tier_type_markdown[key] += f"{matrix_text}\n\n"

                # 🔥 Convert each group's markdown to HTML → carousel slides
                matrix_slides = []
                md = markdown.Markdown(extensions=[
                    'extra',
                    'tables',
                    'nl2br',
                    'sane_lists'
                ])

                def inject_type_badges(html, name_type_map):
                    """
                    Inject MNO/MVNO badges into <th> headers.
                    """
                    import re

                    def replace_th(match):
                        content = match.group(1).strip()
                        content_upper = content.upper()

                        comp_type = name_type_map.get(content_upper)
                        if comp_type:
                            badge_class = comp_type.lower()
                            badge = f' <span class="th-type-badge {badge_class}">{comp_type}</span>'
                            return f"<th>{content}{badge}</th>"
                        return match.group(0)

                    return re.sub(r'<th>(.*?)</th>', replace_th, html)

                for (tier, comp_type), md_text in tier_type_markdown.items():
                    md.reset()
                    html = md.convert(md_text.strip())

                    # 🔥 Inject MNO/MVNO badges into table headers
                    html = inject_type_badges(html, name_type_map)

                    matrix_slides.append({
                        "tier": tier,
                        "competitor_type": comp_type,  # ✅ MNO or MVNO
                        "html": html
                    })

                # 🔹 countries
                cursor.execute(country_query)
                countries = [row[0] for row in cursor.fetchall()]

                # 🔹 types
                cursor.execute(type_query)
                competitor_types = [row[0] for row in cursor.fetchall()]

            # ===============================
            # 🔹 RESPONSE
            # ===============================
            return Response({
                "filters": {
                    "countries": countries,
                    "competitor_types": ["all"] + competitor_types
                },
                "data": {
                    "total": len(competitors),
                    "competitors": competitors,
                    "matrix_slides": matrix_slides  # ✅ Array of {tier, html}
                }
            })

        except Exception as e:
            logger.error(f"Error in CompetitorsView: {str(e)}")
            return Response({"error": str(e)}, status=500)


class CompetitorDetailView(APIView):

    def get(self, request):
        name = request.GET.get("name")
        country = request.GET.get("country")
        comp_type = request.GET.get("type")

        plan_table = '"lens_src"."lyca_competitor_plan_data"'
        tier_table = '"lens_src"."lyca_competitor_tier_analysis"'

        # 🔥 Markdown instance (reuse like your old code)
        md = markdown.Markdown(extensions=[
            'extra',
            'codehilite',
            'tables',
            'toc',
            'nl2br',
            'sane_lists',
        ])

        with connection.cursor() as cursor:

            # ===============================
            # 🔹 STEP 1: LATEST DATE
            # ===============================
            cursor.execute(f"""
                SELECT MAX(date)
                FROM {plan_table}
                WHERE LOWER(name) = LOWER(%s)
                AND LOWER(country) = LOWER(%s)
                AND LOWER(competitor_type) = LOWER(%s)
            """, [name, country, comp_type])

            latest_date = cursor.fetchone()[0]

            if not latest_date:
                return Response({"error": "No data found"}, status=404)

            # ===============================
            # 🔹 STEP 2: PLANS
            # ===============================
            cursor.execute(f"""
                SELECT name, country, competitor_type, plans, date
                FROM {plan_table}
                WHERE LOWER(name) = LOWER(%s)
                AND LOWER(country) = LOWER(%s)
                AND LOWER(competitor_type) = LOWER(%s)
                AND date = %s
            """, [name, country, comp_type, latest_date])

            plan_rows = cursor.fetchall()
            plan_columns = [col[0] for col in cursor.description]

            plans = []
            for row in plan_rows:
                item = dict(zip(plan_columns, row))

                # 🔥 Markdown → HTML
                if item.get("plans"):
                    md.reset()
                    item["plans_html"] = md.convert(item["plans"])
                else:
                    item["plans_html"] = "<em>No plan details available</em>"

                plans.append(item)

            # ===============================
            # 🔹 STEP 3: TIER ANALYSIS
            # ===============================
            cursor.execute(f"""
                SELECT tier, competitor_matrix
                FROM {tier_table}
                WHERE LOWER(competitor_name) = LOWER(%s)
                AND LOWER(country) = LOWER(%s)
                AND LOWER(competitor_type) = LOWER(%s)
                AND date = %s
            """, [name, country, comp_type, latest_date])

            tier_rows = cursor.fetchall()
            tier_columns = [col[0] for col in cursor.description]

            tiers = []
            for row in tier_rows:
                item = dict(zip(tier_columns, row))

                # 🔥 Markdown → HTML
                if item.get("competitor_matrix"):
                    md.reset()
                    item["matrix_html"] = md.convert(item["competitor_matrix"])
                else:
                    item["matrix_html"] = "<em>No matrix data</em>"

                tiers.append(item)

        # ===============================
        # 🔹 RESPONSE
        # ===============================
        return Response({
            "meta": {
                "name": name,
                "country": country,
                "type": comp_type,
                "date": latest_date
            },
            "plans": plans,
            "tiers": tiers
        })






 