# BigQuery Release Navigator

A premium, interactive web interface for navigating, searching, and analyzing Google BigQuery release notes. 

This single-page application parses the official Google Cloud BigQuery RSS feed, restructures raw HTML into a clean, searchable schema, and presents it through a state-of-the-art interactive dashboard with dynamic stats, custom filters, bookmarks, and sharing capabilities.

---

## ✨ Key Features

* **🔄 Real-Time Feed Ingestion**: Ingests and parses Google's official BigQuery release notes RSS feed dynamically.
* **⚡ Smart Cache Layer**: Employs a 10-minute server-side in-memory cache to guarantee microsecond load speeds and prevent rate limits.
* **🔍 Multi-Dimensional Filtering**:
  * **Interactive Search**: Dynamic full-text search with automated text highlighting.
  * **Categories**: Grouped by update tags (*Feature*, *Change*, *Issue*, *Breaking*, *Announcement*).
  * **Time Range**: Filter updates by age (7, 30, 90, 365 days, or All Time).
* **📊 Feed Insights Dashboard**: Live charts displaying the category distribution alongside animated change counters.
* **🔖 Local Bookmarks**: Save individual updates to your browser using `localStorage`, featuring live persistent counters.
* **🌓 Premium Theme Engine**: A rich CSS variable-based light/dark mode honoring system preferences with a manual toggle override. Includes inline protection preventing unstyled flashes (FOUC).
* **🐦 Direct Social Sharing**: Pre-formatted, dynamically truncated sharing of specific release notes directly to X (Twitter).

---

## 🏗️ Technical Architecture

```
.
├── app.py                  # Flask Application (Feed parsing, Caching, and REST API)
├── templates/
│   └── index.html          # Semantic HTML5 & Responsive Core layout
└── static/
    ├── css/
    │   └── styles.css      # Custom HSL-token design system (Animations & Glows)
    └── js/
        └── app.js          # Client-side engine (State, Filtering, & Rendering)
```

### 🐍 Back-End (`app.py`)
Built on **Python** and **Flask**, the server acts as an API gateway. It:
1. Requests the XML feed from Google.
2. Uses `feedparser` to parse XML.
3. Splits raw lump-sum entries into individual change items using custom Regular Expressions (`re`).
4. Implements an in-memory cache to serve data instantly and enables user-forced cache bypass via `/api/releases?force=true`.

### 🌐 Front-End (HTML/CSS/JS)
Built with **vanilla, standard-compliant technologies**:
* **Theme Control**: Blocks unstyled layout shifts by reading `localStorage` before the page paints.
* **Visual Effects**: Built with beautiful background glows, glassmorphism backdrops, high-fidelity loading skeletons, and interactive expandable details.
* **Filtering & Highlights**: Traverses DOM text nodes recursively to safely inject highlighted match tags without corrupting HTML.

---

## 🚀 Getting Started

### Prerequisites
* Python 3.8 or higher
* Git (optional, for version control)

### 1. Clone & Navigate
```bash
git clone https://github.com/beoncloud8/agy-cli-event-talks-app.git
cd agy-cli-event-talks-app
```

### 2. Set Up Virtual Environment (Recommended)
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install flask feedparser
```

### 4. Run the Application
```bash
python app.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser to explore.

---

## ⌨️ Keyboard Shortcuts

We have integrated intuitive keyboard shortcuts to accelerate your navigation:
* **` / `**: Automatically focuses and highlights the search bar from anywhere on the screen.
* **` Esc `**: Blurs/un-focuses the search bar and clears the active search query.

---

## 📜 License & Attribution

Designed and developed by **Antigravity AI**.
Data parsed dynamically from the [Google BigQuery Release Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml).
Licensed under the MIT License.
