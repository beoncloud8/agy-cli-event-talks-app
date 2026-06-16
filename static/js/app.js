/**
 * BigQuery Release Navigator - Frontend Engine
 * Highly interactive, premium single-page application script.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let allReleasesData = null; // Original parsed JSON from backend
  let bookmarks = JSON.parse(localStorage.getItem("bq-bookmarks")) || [];
  let currentFilters = {
    search: "",
    category: "All",
    timePeriod: "all", // "all", "7", "30", "90", "365"
    viewMode: "all" // "all" or "bookmarks"
  };

  // DOM Elements
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search");
  const categoryPills = document.getElementById("category-pills");
  const timeFilterSelect = document.getElementById("time-filter");
  const bookmarkToggleBtn = document.getElementById("bookmark-toggle");
  const bookmarkCountBadge = document.getElementById("bookmark-count");
  const refreshFeedBtn = document.getElementById("refresh-feed");
  const refreshIcon = document.getElementById("refresh-icon");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const exportCsvBtn = document.getElementById("export-csv");
  
  const skeletonContainer = document.getElementById("skeleton-container");
  const releasesContainer = document.getElementById("releases-container");
  const emptyState = document.getElementById("empty-state");
  const resetFiltersBtn = document.getElementById("reset-filters");
  
  const statReleases = document.getElementById("stat-releases");
  const statTotalItems = document.getElementById("stat-total-items");
  const distributionChart = document.getElementById("distribution-chart");
  const statusText = document.getElementById("status-text");
  const statusDot = document.querySelector(".status-dot");
  const resultsCountText = document.getElementById("results-count-text");
  const listTitleText = document.getElementById("list-title-text");

  // Initialize Lucide Icons
  lucide.createIcons();

  // Load Initial Feed Data
  fetchReleaseNotes();

  // ==========================================================================
  // CORE FETCH & DATA PROCESSING
  // ==========================================================================
  async function fetchReleaseNotes(forceRefresh = false) {
    try {
      showLoading(true);
      
      // Spinner animate
      refreshIcon.classList.add("spinning");
      
      const url = forceRefresh ? "/api/releases?force=true" : "/api/releases";
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      allReleasesData = data;
      
      // Process dates on items (attach raw timestamps for sorting/filtering)
      allReleasesData.entries.forEach(entry => {
        // Build stable unique IDs for individual items (date + index)
        entry.items.forEach((item, index) => {
          item.id = `${entry.title}-${index}`.replace(/\s+/g, '-').toLowerCase();
          item.dateStr = entry.title;
          item.timestamp = new Date(entry.updated || entry.title).getTime();
          item.link = entry.link;
        });
      });

      // Render Dashboard & List
      renderDashboardStats();
      applyFiltersAndRender();
      updateFeedStatusText();
      
      showLoading(false);
      showToast(forceRefresh ? "Feed refreshed successfully" : "Feed loaded successfully");
    } catch (error) {
      console.error("Error fetching release notes:", error);
      showErrorState();
    } finally {
      refreshIcon.classList.remove("spinning");
    }
  }

  // ==========================================================================
  // UI STATUS & SKELETON HANDLERS
  // ==========================================================================
  function showLoading(isLoading) {
    if (isLoading) {
      skeletonContainer.style.display = "flex";
      releasesContainer.style.display = "none";
      emptyState.style.display = "none";
      if (exportCsvBtn) exportCsvBtn.style.display = "none";
    } else {
      skeletonContainer.style.display = "none";
      releasesContainer.style.display = "flex";
      if (exportCsvBtn) exportCsvBtn.style.display = "flex";
    }
  }

  function showErrorState() {
    skeletonContainer.style.display = "none";
    releasesContainer.style.display = "none";
    emptyState.style.display = "flex";
    
    const title = emptyState.querySelector("h3");
    const desc = emptyState.querySelector("p");
    title.textContent = "Unable to load feed";
    desc.textContent = "There was a problem communicating with the server. Please verify your internet connection or try again later.";
  }

  function updateFeedStatusText() {
    if (!allReleasesData) return;
    
    statusDot.classList.add("active");
    
    const cachedAt = new Date(allReleasesData.cached_at);
    const formattedTime = cachedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (allReleasesData.is_cached) {
      const minutesAgo = Math.floor(allReleasesData.cache_age_seconds / 60);
      statusText.textContent = `Cached ${minutesAgo}m ago (${formattedTime})`;
    } else {
      statusText.textContent = `Live at ${formattedTime}`;
    }
  }

  // ==========================================================================
  // METRICS & CHARTS RENDERING
  // ==========================================================================
  function renderDashboardStats() {
    if (!allReleasesData) return;
    
    const stats = allReleasesData.stats;
    
    // Animate stats numbers
    animateNumber(statReleases, stats.total_releases);
    animateNumber(statTotalItems, stats.total_items);
    
    // Render dynamic bar chart representing category distribution
    renderDistributionChart(stats.categories, stats.total_items);
    
    // Update bookmarks count
    bookmarkCountBadge.textContent = bookmarks.length;
  }

  function animateNumber(element, finalValue) {
    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const easedProgress = progress * (2 - progress);
      const currentValue = Math.floor(start + easedProgress * (finalValue - start));
      
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  function renderDistributionChart(categories, total) {
    distributionChart.innerHTML = "";
    
    if (!categories || Object.keys(categories).length === 0) {
      distributionChart.innerHTML = `<div class="chart-placeholder">No distribution data</div>`;
      return;
    }
    
    // Sort categories by count descending
    const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    
    sortedCats.forEach(([cat, count]) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const catClass = cat.toLowerCase();
      
      const barItem = document.createElement("div");
      barItem.className = "chart-bar-item";
      barItem.innerHTML = `
        <div class="chart-bar-info">
          <span class="chart-bar-label">${cat}</span>
          <span class="chart-bar-count">${count} (${Math.round(percentage)}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill ${catClass}" style="width: 0%"></div>
        </div>
      `;
      
      distributionChart.appendChild(barItem);
      
      // Small timeout to allow CSS rendering before animating width
      setTimeout(() => {
        const fill = barItem.querySelector(".chart-bar-fill");
        if (fill) fill.style.width = `${percentage}%`;
      }, 50);
    });
  }

  // ==========================================================================
  // FILTERS & SEARCH PROCESSOR
  // ==========================================================================
  function applyFiltersAndRender() {
    if (!allReleasesData) return;
    
    // Title context (are we in bookmark mode?)
    if (currentFilters.viewMode === "bookmarks") {
      listTitleText.textContent = "Bookmarked Updates";
      bookmarkToggleBtn.classList.add("active");
    } else {
      listTitleText.textContent = "All Release Notes";
      bookmarkToggleBtn.classList.remove("active");
    }

    const filteredReleases = [];
    let matchedItemCount = 0;
    let matchedReleaseCount = 0;

    // Time ranges calculations
    const now = Date.now();
    let timeLimit = 0;
    if (currentFilters.timePeriod !== "all") {
      const days = parseInt(currentFilters.timePeriod);
      timeLimit = now - (days * 24 * 60 * 60 * 1000);
    }

    // Process each release entry
    allReleasesData.entries.forEach(entry => {
      const matchedItems = [];

      entry.items.forEach(item => {
        // 1. View Mode (Bookmarks only)
        if (currentFilters.viewMode === "bookmarks" && !bookmarks.includes(item.id)) {
          return;
        }

        // 2. Category Filter
        if (currentFilters.category !== "All" && item.category !== currentFilters.category) {
          return;
        }

        // 3. Time Filter
        if (timeLimit > 0 && item.timestamp < timeLimit) {
          return;
        }

        // 4. Search Filter
        if (currentFilters.search) {
          const searchLower = currentFilters.search.toLowerCase();
          const matchesCategory = item.category.toLowerCase().includes(searchLower);
          
          // Strip HTML tags for clean text search match
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = item.content;
          const cleanText = tempDiv.textContent || tempDiv.innerText || "";
          const matchesContent = cleanText.toLowerCase().includes(searchLower);
          
          if (!matchesCategory && !matchesContent) {
            return;
          }
        }

        // Passed all filters!
        matchedItems.push(item);
        matchedItemCount++;
      });

      if (matchedItems.length > 0) {
        filteredReleases.push({
          ...entry,
          items: matchedItems
        });
        matchedReleaseCount++;
      }
    });

    // Render results
    renderReleasesList(filteredReleases);
    
    // Update results summary
    if (currentFilters.viewMode === "bookmarks") {
      resultsCountText.textContent = `${matchedItemCount} saved change${matchedItemCount === 1 ? "" : "s"}`;
    } else {
      resultsCountText.textContent = `Showing ${matchedItemCount} change${matchedItemCount === 1 ? "" : "s"} across ${matchedReleaseCount} release day${matchedReleaseCount === 1 ? "" : "s"}`;
    }
  }

  // ==========================================================================
  // RENDERING ENGINE
  // ==========================================================================
  function renderReleasesList(releases) {
    releasesContainer.innerHTML = "";
    
    if (releases.length === 0) {
      releasesContainer.style.display = "none";
      emptyState.style.display = "flex";
      return;
    }
    
    emptyState.style.display = "none";
    releasesContainer.style.display = "flex";

    releases.forEach((release, cardIndex) => {
      const card = document.createElement("article");
      card.className = "release-card";
      card.style.animationDelay = `${cardIndex * 40}ms`; // Cascading staggered animation
      
      // Calculate display date beautifully
      const rawDate = new Date(release.updated || release.title);
      const dateFormatted = rawDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      card.innerHTML = `
        <div class="card-title-row">
          <div class="card-date">
            <i data-lucide="calendar" class="date-icon"></i>
            <h3>${release.title}</h3>
          </div>
          <div class="card-meta-actions">
            <button class="btn-icon btn-secondary btn-mini copy-card-btn" title="Copy Card Notes to Clipboard">
              <i data-lucide="copy"></i>
            </button>
            <button class="btn-icon btn-secondary btn-mini share-release-btn" data-url="${release.link}" title="Copy Release Link">
              <i data-lucide="share-2"></i>
            </button>
          </div>
        </div>
        <div class="release-items">
          <!-- Populated per update item -->
        </div>
      `;

      // Attach copy card handler
      const copyCardBtn = card.querySelector(".copy-card-btn");
      if (copyCardBtn) {
        copyCardBtn.addEventListener("click", () => {
          copyCardContent(release);
        });
      }

      const itemsContainer = card.querySelector(".release-items");

      release.items.forEach(item => {
        const isBookmarked = bookmarks.includes(item.id);
        const itemCatClass = item.category.toLowerCase();
        
        // Setup direct icons for category
        let catIcon = "sparkles";
        if (itemCatClass === "issue") catIcon = "alert-triangle";
        else if (itemCatClass === "change") catIcon = "refresh-cw";
        else if (itemCatClass === "breaking") catIcon = "shield-alert";
        else if (itemCatClass === "announcement") catIcon = "megaphone";

        // Highlight matching text if search is active
        let contentHtml = item.content;
        let previewText = getCleanPreviewText(item.content);
        
        if (currentFilters.search) {
          contentHtml = highlightText(contentHtml, currentFilters.search);
          previewText = highlightText(previewText, currentFilters.search);
        }

        const itemNode = document.createElement("div");
        itemNode.className = `update-item ${itemCatClass}`;
        itemNode.innerHTML = `
          <details class="update-disclosure" name="release-${cardIndex}">
            <summary class="update-summary">
              <div class="update-summary-left">
                <span class="category-tag"><i data-lucide="${catIcon}" style="width: 11px; height: 11px; vertical-align: middle; margin-right: 4px;"></i>${item.category}</span>
                <span class="summary-preview-text">${previewText}</span>
              </div>
              <div class="update-summary-right">
                <button class="btn-icon btn-secondary btn-mini bookmark-item-btn ${isBookmarked ? 'active' : ''}" data-id="${item.id}" title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Update'}">
                  <i data-lucide="bookmark"></i>
                </button>
                <i data-lucide="chevron-down" class="chevron-icon"></i>
              </div>
            </summary>
            <div class="update-details-body">
              <div class="update-details-html">
                ${contentHtml}
              </div>
              <div class="item-actions-row">
                <button class="btn btn-tweet tweet-item-btn" title="Tweet about this update">
                  <svg class="twitter-x-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align: middle; margin-right: 6px;">
                    <path d="M18.244 2.25h3.308l-7.227 7.56 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.085L1.254 2.25h6.88l4.721 6.244zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X (Twitter)
                </button>
              </div>
            </div>
          </details>
        `;

        // Attach event listeners to details summary buttons to prevent collapse toggle when clicking buttons
        const bookmarkBtn = itemNode.querySelector(".bookmark-item-btn");
        bookmarkBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleBookmark(item.id, bookmarkBtn);
        });

        // Attach Tweet button listener
        const tweetBtn = itemNode.querySelector(".tweet-item-btn");
        tweetBtn.addEventListener("click", (e) => {
          e.preventDefault();
          shareOnTwitter(item.category, item.dateStr, item.content, item.link);
        });

        itemsContainer.appendChild(itemNode);
      });

      releasesContainer.appendChild(card);
    });

    // Refresh Lucide Icons on dynamically added elements
    lucide.createIcons();
    
    // Attach share handlers
    document.querySelectorAll(".share-release-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-url");
        copyToClipboard(url);
      });
    });
  }

  // Helper: Strip HTML tags and return first sentence/part of entry
  function getCleanPreviewText(htmlContent) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    // Grab the first sentence or first 120 characters
    const firstSentence = text.split(".")[0];
    return firstSentence.length > 100 ? firstSentence.slice(0, 100) + "..." : firstSentence + ".";
  }

  // Helper: Format and launch Twitter (X) Web Intent with clean, truncated release notes
  function shareOnTwitter(category, date, contentHtml, link) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = contentHtml;
    const cleanText = (tempDiv.textContent || tempDiv.innerText || "").trim();
    
    // Twitter/X has a 280-char limit.
    // Let's constrain the preview to ~170 characters so the category, date, spacer, hashtags, and link fit comfortably.
    let tweetPreview = cleanText;
    if (tweetPreview.length > 170) {
      tweetPreview = tweetPreview.slice(0, 167) + "...";
    }
    
    const tweetText = `BigQuery ${category} [${date}]: "${tweetPreview}"\n\n#BigQuery #GoogleCloud`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(link)}`;
    
    // Open X share window as a beautiful centered popup
    const width = 600;
    const height = 450;
    const left = (window.innerWidth - width) / 2 + window.screenX;
    const top = (window.innerHeight - height) / 2 + window.screenY;
    
    window.open(twitterUrl, "Share on X", `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`);
    showToast("Twitter sharing opened");
  }

  // Helper: Inject `<mark class="search-highlight">` tags into text nodes
  function highlightText(html, search) {
    if (!search) return html;
    
    // Avoid breaking HTML tags by targeting only the text nodes
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
    
    function highlightNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (regex.test(node.nodeValue)) {
          const span = document.createElement("span");
          span.innerHTML = node.nodeValue.replace(regex, '<mark style="background-color: var(--color-primary-soft); color: var(--color-primary); padding: 0 2px; border-radius: 2px; font-weight: 600;">$1</mark>');
          node.parentNode.replaceChild(span, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== "A" && node.nodeName !== "PRE" && node.nodeName !== "CODE") {
        // Recurse into children, skip interactive nodes like anchors & code blocks to keep rendering stable
        Array.from(node.childNodes).forEach(highlightNode);
      }
    }
    
    Array.from(tempDiv.childNodes).forEach(highlightNode);
    return tempDiv.innerHTML;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ==========================================================================
  // BOOKMARK MANAGEMENT
  // ==========================================================================
  function toggleBookmark(itemId, buttonNode) {
    const index = bookmarks.indexOf(itemId);
    
    if (index === -1) {
      // Add bookmark
      bookmarks.push(itemId);
      buttonNode.classList.add("active");
      showToast("Update bookmarked successfully");
    } else {
      // Remove bookmark
      bookmarks.splice(index, 1);
      buttonNode.classList.remove("active");
      showToast("Bookmark removed");
      
      // If we are currently in bookmark view, re-filter instantly!
      if (currentFilters.viewMode === "bookmarks") {
        setTimeout(applyFiltersAndRender, 200);
      }
    }
    
    localStorage.setItem("bq-bookmarks", JSON.stringify(bookmarks));
    bookmarkCountBadge.textContent = bookmarks.length;
    
    // Trigger tiny pop animation
    buttonNode.style.transform = "scale(1.2)";
    setTimeout(() => {
      buttonNode.style.transform = "";
    }, 150);
  }

  // ==========================================================================
  // TOAST & UTILITIES
  // ==========================================================================
  function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector(".toast-notification");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.innerHTML = `
      <div class="toast-content">
        <i data-lucide="check-circle" class="toast-icon"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Style Toast directly
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      backgroundColor: "var(--color-text-primary)",
      color: "var(--color-bg)",
      padding: "10px 16px",
      borderRadius: "10px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
      fontSize: "0.85rem",
      fontWeight: "600",
      zIndex: "9999",
      display: "flex",
      alignItems: "center",
      transform: "translateY(100px)",
      opacity: "0",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    });

    document.body.appendChild(toast);
    lucide.createIcons();
    
    // Tiny delay to trigger animation
    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 50);

    // Fade out
    setTimeout(() => {
      toast.style.transform = "translateY(20px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function copyToClipboard(text, customMessage = "Direct link copied to clipboard") {
    try {
      await navigator.clipboard.writeText(text);
      showToast(customMessage);
    } catch (err) {
      console.error("Failed to copy to clipboard", err);
      // Fallback
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      showToast(customMessage);
    }
  }

  function copyCardContent(release) {
    let text = `BigQuery Release Notes - ${release.title}\n`;
    text += `${"=".repeat(40)}\n\n`;
    
    release.items.forEach((item, index) => {
      // Strip HTML tags for clean text content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = item.content;
      const cleanContent = tempDiv.textContent || tempDiv.innerText || "";
      
      text += `[${item.category}] (${index + 1})\n`;
      text += `${cleanContent.trim()}\n\n`;
    });
    
    text += `Source Link: ${release.link}\n`;
    
    copyToClipboard(text, `Copied notes for ${release.title}`);
  }

  function exportFilteredToCSV() {
    if (!allReleasesData) return;
    
    // Build CSV content
    const csvRows = [
      ["Date", "Category", "Content", "Source Link"] // CSV Header
    ];
    
    // Time ranges calculations
    const now = Date.now();
    let timeLimit = 0;
    if (currentFilters.timePeriod !== "all") {
      const days = parseInt(currentFilters.timePeriod);
      timeLimit = now - (days * 24 * 60 * 60 * 1000);
    }

    allReleasesData.entries.forEach(entry => {
      entry.items.forEach(item => {
        // 1. View Mode (Bookmarks only)
        if (currentFilters.viewMode === "bookmarks" && !bookmarks.includes(item.id)) {
          return;
        }

        // 2. Category Filter
        if (currentFilters.category !== "All" && item.category !== currentFilters.category) {
          return;
        }

        // 3. Time Filter
        if (timeLimit > 0 && item.timestamp < timeLimit) {
          return;
        }

        // 4. Search Filter
        if (currentFilters.search) {
          const searchLower = currentFilters.search.toLowerCase();
          const matchesCategory = item.category.toLowerCase().includes(searchLower);
          
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = item.content;
          const cleanText = tempDiv.textContent || tempDiv.innerText || "";
          const matchesContent = cleanText.toLowerCase().includes(searchLower);
          
          if (!matchesCategory && !matchesContent) {
            return;
          }
        }

        // Strip HTML tags from item content for clean plain-text CSV cell
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = item.content;
        const cleanContent = (tempDiv.textContent || tempDiv.innerText || "").trim();

        // Escape double quotes inside CSV cell
        const escapedContent = cleanContent.replace(/"/g, '""');
        const escapedDate = entry.title.replace(/"/g, '""');
        const escapedCategory = item.category.replace(/"/g, '""');
        const escapedLink = entry.link.replace(/"/g, '""');

        csvRows.push([
          `"${escapedDate}"`,
          `"${escapedCategory}"`,
          `"${escapedContent}"`,
          `"${escapedLink}"`
        ]);
      });
    });

    if (csvRows.length <= 1) {
      showToast("No release notes found to export");
      return;
    }

    // Join rows with CRLF
    const csvContent = csvRows.map(e => e.join(",")).join("\r\n");
    
    // Create Blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Construct dynamic filename based on active filters
    let filename = "bigquery-releases";
    if (currentFilters.category !== "All") {
      filename += `-${currentFilters.category.toLowerCase()}`;
    }
    if (currentFilters.search) {
      filename += `-search`;
    }
    if (currentFilters.viewMode === "bookmarks") {
      filename += "-bookmarks";
    }
    filename += ".csv";

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${csvRows.length - 1} items to CSV`);
  }

  // ==========================================================================
  // LIGHT / DARK MANUAL TOGGLE ( respecting modern-web rules )
  // ==========================================================================
  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark-theme");
    const nextTheme = isDark ? "light" : "dark";
    
    localStorage.setItem("color-scheme", nextTheme);
    document.querySelector('meta[name="color-scheme"]').content = nextTheme;
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark-theme");
      document.documentElement.classList.remove("light-theme");
      showToast("Dark theme enabled");
    } else {
      document.documentElement.classList.add("light-theme");
      document.documentElement.classList.remove("dark-theme");
      showToast("Light theme enabled");
    }
  });

  // Listen to external OS theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const cachedScheme = localStorage.getItem("color-scheme") || "system";
    if (cachedScheme === "system") {
      const isDark = e.matches;
      document.querySelector('meta[name="color-scheme"]').content = isDark ? "dark" : "light";
      if (isDark) {
        document.documentElement.classList.add("dark-theme");
        document.documentElement.classList.remove("light-theme");
      } else {
        document.documentElement.classList.add("light-theme");
        document.documentElement.classList.remove("dark-theme");
      }
    }
  });

  // ==========================================================================
  // INTERACTIVE EVENT LISTENERS & SHORTCUTS
  // ==========================================================================
  
  // Search Input Events
  searchInput.addEventListener("input", (e) => {
    currentFilters.search = e.target.value.trim();
    clearSearchBtn.style.display = currentFilters.search ? "flex" : "none";
    applyFiltersAndRender();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentFilters.search = "";
    clearSearchBtn.style.display = "none";
    searchInput.focus();
    applyFiltersAndRender();
  });

  // Category Pill Clicks
  categoryPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    
    categoryPills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    
    currentFilters.category = pill.getAttribute("data-category");
    applyFiltersAndRender();
  });

  // Time Period Select changes
  timeFilterSelect.addEventListener("change", (e) => {
    currentFilters.timePeriod = e.target.value;
    applyFiltersAndRender();
  });

  // Bookmarks Toggle header button
  bookmarkToggleBtn.addEventListener("click", () => {
    if (currentFilters.viewMode === "bookmarks") {
      currentFilters.viewMode = "all";
      bookmarkToggleBtn.classList.remove("active");
    } else {
      currentFilters.viewMode = "bookmarks";
      bookmarkToggleBtn.classList.add("active");
    }
    applyFiltersAndRender();
  });

  // Force Refresh Trigger
  refreshFeedBtn.addEventListener("click", () => {
    fetchReleaseNotes(true);
  });

  // Export to CSV Trigger
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      exportFilteredToCSV();
    });
  }

  // Reset Filters Empty State Action
  resetFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentFilters.search = "";
    clearSearchBtn.style.display = "none";
    
    categoryPills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    categoryPills.querySelector('[data-category="All"]').classList.add("active");
    currentFilters.category = "All";
    
    timeFilterSelect.value = "all";
    currentFilters.timePeriod = "all";
    
    currentFilters.viewMode = "all";
    
    applyFiltersAndRender();
    showToast("Filters reset successfully");
  });

  // Keyboard Shortcuts ('/' to focus, 'Esc' to blur & clear)
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === "Escape" && document.activeElement === searchInput) {
      searchInput.blur();
    }
  });
});
