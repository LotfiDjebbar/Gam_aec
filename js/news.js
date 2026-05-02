/**
 * news.js
 * Fetch real-time news related to the insurance market in Algeria
 * Uses rss2json API to parse Google News RSS feed for free.
 */

const NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss%2Fsearch%3Fq%3Dassurance%2Balgerie%26hl%3Dfr%26gl%3DDZ%26ceid%3DDZ%3Afr';

async function fetchNews() {
  const tickerContent = document.getElementById('news-ticker-content');
  
  if (!tickerContent) return;

  try {
    const response = await fetch(NEWS_API_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    if (data.status === 'ok' && data.items && data.items.length > 0) {
      // Clear the loading message
      tickerContent.innerHTML = '';
      
      // Limit to 10 latest news items to avoid overly long tickers
      const latestNews = data.items.slice(0, 10);
      
      latestNews.forEach(item => {
        const newsItem = document.createElement('span');
        newsItem.className = 'news-item';
        
        const date = new Date(item.pubDate);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}`;
        
        newsItem.innerHTML = `<span style="opacity:0.7; margin-right:8px; font-weight:600;">${formattedDate}</span> <a href="${item.link}" target="_blank" class="news-link">${item.title}</a>`;
        
        tickerContent.appendChild(newsItem);
      });
      
      // Duplicate content to create a seamless infinite scroll loop
      const clonedContent = tickerContent.innerHTML;
      tickerContent.innerHTML += clonedContent;
      
    } else {
      throw new Error('No news items found');
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    tickerContent.innerHTML = `<span class="news-item">Impossible de charger les actualités pour le moment. Vérifiez votre connexion.</span>`;
  }
}

// Fetch news immediately when the script loads
fetchNews();

// Refresh news every hour
setInterval(fetchNews, 3600000);
