def build_chart(
    chart_id,
    chart_type,
    data,
    x_key,
    y_key=None,
    drill_key=None,   # ✅ ADDED
    segment_drill_key=None,  # ✅ for stacked bar segment clicks
    x_drill_key=None,        # ✅ for stacked bar x-axis drilldown
    title="",
    tooltip="",
    icon="",
    layout=None,
    color=None,  # Can be string, list, or dict
    radius=None,
    margin=None,
    x_label_offset=None,
    y_label_offset=None,
    series=None,
    is_date=False,
    height=None,
    x_label=None,
    y_label=None
):
    """
    Clean chart builder with explicit chart types:
    - bar (single series)
    - stackedbar (multi-series stacked)
    - area (single or multi-series)
    - pie
    - treemap
    
    Color can be:
    - String: "#7B61FF" (single color)
    - List: ["#3B82F6", "#EF4444"] (alternating colors)
    - Dict: {"resolved": "#10b95d", "pending": "#3B82F6"} (semantic mapping)
    """

    margin = margin or {"top": 20, "right": 10, "left": 20, "bottom": 30}

    print("BUILD CHART DRILL KEY:", drill_key)

    # ================= BAR (SINGLE SERIES) =================
    if chart_type == "bar":
        layout = (layout or "vertical").lower()
        
        final_radius = radius or (
            [0, 8, 8, 0] if layout == "vertical" else [8, 8, 0, 0]
        )

        # ✅ Enhanced color handling
        x_label_final = x_label or x_key.capitalize()
        
        if y_label:
            y_label_final = y_label
        elif y_key:
            y_label_final = y_key.capitalize()
        else:
            y_label_final = "Count"
        
        config = {
            "xKey": x_key,
            "yKey": y_key or "value",
            "drillKey": drill_key,   # ✅ ADDED
            "layout": layout,
            "color": color if isinstance(color, str) else None,
            "colors": color if isinstance(color, list) else None,
            "colorsMap": color if isinstance(color, dict) else None,
            "radius": final_radius,
            "margin": margin,
            "xLabel": x_label_final,
            "yLabel": y_label_final,
            "xLabelOffset": x_label_offset if x_label_offset is not None else -10,
            "yLabelOffset": y_label_offset if y_label_offset is not None else -10,
            "isDate": is_date,
            "height": height
        }

    # ================= STACKED BAR =================
    elif chart_type == "stackedbar":
        layout = (layout or "vertical").lower()

        if not series:
            raise ValueError("stackedbar requires 'series'")

        bars = []

        for i, s in enumerate(series):
            is_top = i == len(series) - 1

            final_radius = radius or (
                [0, 8, 8, 0] if layout == "vertical" else [8, 8, 0, 0]
            )

            # ✅ Series colors can also be dynamic
            bar_color = s.get("color")
            if not bar_color and isinstance(color, dict):
                bar_color = color.get(s.get("key"))
            elif not bar_color and isinstance(color, list) and i < len(color):
                bar_color = color[i]
            elif not bar_color:
                bar_color = color if isinstance(color, str) else "#7B61FF"

            bars.append({
                "key": s.get("key"),
                "name": s.get("name", s.get("key").capitalize()),
                "color": bar_color,
                "stackId": chart_id,
                "radius": final_radius if is_top else [0, 0, 0, 0]
            })

        x_label_final = x_label or x_key.capitalize()
        
        if y_label:
            y_label_final = y_label
        elif y_key:
            y_label_final = y_key.capitalize()
        else:
            y_label_final = "Count"
        
        config = {
            "xKey": x_key,
            "drillKey": drill_key,   # ✅ ADDED
            "segmentDrillKey": segment_drill_key,  # ✅ for segment clicks
            "xDrillKey": x_drill_key,  # ✅ for x-axis drilldown
            "layout": layout,
            "bars": bars,
            "margin": margin,
            "xLabel": x_label_final,
            "yLabel": y_label_final,
            "xLabelOffset": x_label_offset if x_label_offset is not None else -10,
            "yLabelOffset": y_label_offset if y_label_offset is not None else -10,
            "isDate": is_date,
            "height": height
        }

    # ================= AREA =================
    elif chart_type == "area":
        areas = []
        
        if series and len(series) > 0:
            # Multi-series area chart
            for i, s in enumerate(series):
                # ✅ Area colors with priority
                area_color = s.get("color")
                if not area_color and isinstance(color, dict):
                    area_color = color.get(s.get("key"))
                elif not area_color and isinstance(color, list) and i < len(color):
                    area_color = color[i]
                elif not area_color:
                    area_color = color if isinstance(color, str) else "#7B61FF"
                
                areas.append({
                    "key": s.get("key"),
                    "name": s.get("name", s.get("key").capitalize()),
                    "color": area_color
                })
        else:
            # Single-series area chart
            area_color = color if isinstance(color, str) else "#7B61FF"
            areas.append({
                "key": y_key or "value",
                "color": area_color
            })
        
        x_label_final = x_label or x_key.capitalize()
        
        if y_label:
            y_label_final = y_label
        elif y_key:
            y_label_final = y_key.capitalize()
        else:
            y_label_final = "Value"
        
        config = {
            "xKey": x_key,
            "yKey": y_key or "value",
            "drillKey": drill_key,   # ✅ ADDED
            "areas": areas,
            "margin": margin,
            "xLabel": x_label_final,
            "yLabel": y_label_final,
            "xLabelOffset": x_label_offset if x_label_offset is not None else -10,
            "yLabelOffset": y_label_offset if y_label_offset is not None else -10,
            "isDate": is_date,
            "height": height
        }

    # ================= PIE =================
    elif chart_type == "pie":
        config = {
            "nameKey": x_key,
            "dataKey": y_key or "value",
            "drillKey": drill_key,   # ✅ ADDED
            "radius": radius or 0.8,
            "innerRadius": 0,
            "isDate": is_date,
            "colors": color if isinstance(color, list) else None,
            "colorsMap": color if isinstance(color, dict) else None,
            "height": height
        }

    # ================= TREEMAP =================
    elif chart_type == "treemap":
        # ✅ Treemap can also use semantic colors
        treemap_colors = None
        if isinstance(color, list):
            treemap_colors = color
        elif isinstance(color, str):
            treemap_colors = [color]
        elif isinstance(color, dict):
            # For treemap, we'll use the first color from dict or default
            treemap_colors = [list(color.values())[0] if color else "#7B61FF"]
        else:
            treemap_colors = ["#7B61FF"]
        
        config = {
            "dataKey": "value",
            "nameKey": x_key,
            "drillKey": drill_key,   # ✅ ADDED
            "colors": treemap_colors,
            "stroke": "#fff",
            "borderRadius": radius or 4,
            "aspectRatio": 4 / 3,
            "isDate": is_date,
            "height": height
        }

    else:
        raise ValueError(f"Unsupported chart_type: {chart_type}")

    # ================= FINAL OBJECT =================
    return {
        "id": chart_id,
        "title": title,
        "tooltip": tooltip,
        "icon": icon,
        "type": chart_type,
        "data": data,
        "config": config
    }