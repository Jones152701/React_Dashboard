# chart_builder.py

def build_chart(
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
    """
    Build a chart configuration for the frontend
    
    Args:
        chart_id: Unique identifier for the chart
        chart_type: Type of chart ('bar', 'area', 'pie')
        data: List of dictionaries containing chart data
        x_key: Key for x-axis values in data objects
        y_label: Label for y-axis
        title: Chart title
        tooltip: Tooltip text for the chart
        icon: Icon class name for the chart
        layout: Layout for bar charts ('horizontal' or 'vertical')
        color: Color for the chart elements
        radius: Border radius for bars
        margin: Margin configuration dictionary
        x_label_offset: Offset for x-axis label
        y_label_offset: Offset for y-axis label
    
    Returns:
        dict: Chart configuration dictionary
    """
    
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