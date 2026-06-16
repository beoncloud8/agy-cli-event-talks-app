import time
import feedparser
import re
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "timestamp": 0,
    "expiry_seconds": 600  # 10 minutes cache
}

def parse_release_feed():
    try:
        feed = feedparser.parse(FEED_URL)
        if not feed.entries:
            return None
        
        entries = []
        all_categories = {}
        total_items = 0
        
        for entry in feed.entries:
            summary_html = entry.get("summary", "")
            
            # Split summary HTML into categorized chunks
            chunks = re.split(r'<h3>', summary_html)
            items = []
            
            for chunk in chunks:
                if not chunk.strip():
                    continue
                parts = chunk.split('</h3>', 1)
                if len(parts) == 2:
                    category = parts[0].strip()
                    content = parts[1].strip()
                    items.append({
                        "category": category,
                        "content": content
                    })
                    all_categories[category] = all_categories.get(category, 0) + 1
                    total_items += 1
            
            entries.append({
                "id": entry.get("id", ""),
                "title": entry.get("title", ""),  # e.g. "June 15, 2026"
                "updated": entry.get("updated", ""),
                "link": entry.get("link", ""),
                "raw_html": summary_html,
                "items": items
            })
            
        stats = {
            "total_releases": len(entries),
            "total_items": total_items,
            "categories": all_categories
        }
        
        return {
            "title": feed.feed.get("title", "BigQuery - Release notes"),
            "link": feed.feed.get("link", "https://cloud.google.com/bigquery/docs/release-notes"),
            "last_updated": feed.feed.get("updated", ""),
            "entries": entries,
            "stats": stats
        }
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

def get_cached_feed(force_refresh=False):
    current_time = time.time()
    if force_refresh or not cache["data"] or (current_time - cache["timestamp"] > cache["expiry_seconds"]):
        parsed_data = parse_release_feed()
        if parsed_data:
            cache["data"] = parsed_data
            cache["timestamp"] = current_time
    
    if cache["data"]:
        # Add cache status details to the return object
        response_data = dict(cache["data"])
        response_data["cached_at"] = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(cache["timestamp"]))
        response_data["cache_age_seconds"] = int(current_time - cache["timestamp"])
        response_data["is_cached"] = (current_time - cache["timestamp"] > 2) # true if retrieved from cache, false if fresh
        return response_data
    return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force = request.args.get('force', 'false').lower() == 'true'
    data = get_cached_feed(force_refresh=force)
    if data:
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch or parse release notes feed"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
