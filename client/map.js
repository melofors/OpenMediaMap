import { API_BASE_URL } from './config.js';

/* ------------------ Query params (must be defined BEFORE fetch) ------------------ */
function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const lat = parseFloat(urlParams.get('lat'));
  const lng = parseFloat(urlParams.get('lng'));
  const id = urlParams.get('id');
  return { lat, lng, id };
}

const { lat: targetLat, lng: targetLng, id: targetId } = getQueryParams();

/* ------------------ Helpers ------------------ */
function joinUrl(base, path) {
  // base can be "", "/", "https://openmediamap.com", "https://openmediamap.com/"
  const b = (base || '').trim();

  // If base is empty, prefer relative path
  if (!b) return path;

  // If base is just "/", also treat as relative
  if (b === '/') return path;

  // Remove trailing slash from base, ensure path starts with slash
  const cleanBase = b.endsWith('/') ? b.slice(0, -1) : b;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/* ------------------ Map setup ------------------ */
const element = document.getElementById('map');
const map = L.map(element, {
  minZoom: 2,
  maxZoom: 18,
  zoom: 11
});

map.setView(L.latLng(39.30694932409297, -76.75407587537397));

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

/* ------------------ Marker Icons ------------------ */
const LeafIcon = L.Icon.extend({
  options: {
    iconSize: [20, 32],
    iconAnchor: [11, 33],
    popupAnchor: [-1, -33]
  }
});

const LeafIconSmall = L.Icon.extend({
  options: {
    iconSize: [45, 36],
    iconAnchor: [22, 32],
    popupAnchor: [0, -30]
  }
});

const markerIcons = {
  '1700s': new LeafIconSmall({ iconUrl: 'markers/1700s and below.png' }),
  '1800s_early': new LeafIcon({ iconUrl: 'markers/1800s early.png' }),
  '1800s_mid': new LeafIcon({ iconUrl: 'markers/1800s mid.png' }),
  '1800s_late': new LeafIcon({ iconUrl: 'markers/1800s late.png' }),
  '1900s': new LeafIcon({ iconUrl: 'markers/1900s.png' }),
  '1910s': new LeafIcon({ iconUrl: 'markers/1910s.png' }),
  '1920s': new LeafIcon({ iconUrl: 'markers/1920s.png' }),
  '1930s': new LeafIcon({ iconUrl: 'markers/1930s.png' }),
  'undated': new LeafIcon({ iconUrl: 'markers/unknown.png' }),
  'pre1900': new LeafIcon({ iconUrl: 'logos/marker3.png' }),
  'post1900': new LeafIcon({ iconUrl: 'logos/marker4.png' })
};

/* ------------------ Load Dynamic Markers ------------------ */
async function fetchAndRenderMarkers() {
  try {
    const url = joinUrl(API_BASE_URL, '/api/submissions/approved');
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Loaded marker data:', data);

    data.forEach(submission => {
      const {
        id,
        caption,
        source,
        photographer,
        year,
        month,
        day,
        estimated,
        photo_url,
        lat,
        lng,
        location
      } = submission;

      // Skip rendering markers if location is false (no valid coordinates)
      if (location === false) {
        console.warn(`Skipping submission ${id} because location is false.`);
        return;
      }

      // Guard against missing coords
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.warn(`Skipping submission ${id} due to missing/invalid lat/lng`, { lat, lng });
        return;
      }

      // Determine icon based on year
      let icon;
      if (!year || isNaN(year)) icon = markerIcons.undated;
      else if (year < 1800) icon = markerIcons['1700s'];
      else if (year < 1850) icon = markerIcons['1800s_early'];
      else if (year < 1880) icon = markerIcons['1800s_mid'];
      else if (year < 1900) icon = markerIcons['1800s_late'];
      else if (year < 1910) icon = markerIcons['1900s'];
      else if (year < 1920) icon = markerIcons['1910s'];
      else if (year < 1930) icon = markerIcons['1920s'];
      else icon = markerIcons['1930s'];

      // Build formatted date
      let dateStr = '';
      if (year) {
        dateStr = `${year}`;
        if (month) {
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
          dateStr = `${monthName} ${year}`;
          if (day) dateStr = `${monthName} ${day}, ${year}`;
        }
      }
      const formattedDate = dateStr ? (estimated ? `c. ${dateStr}` : dateStr) : 'Date unknown';

      // Create popup HTML
      const safePhoto = photo_url ? String(photo_url) : '';
      const popupHTML = `
        <h3>${formattedDate}</h3>

        <div class="caption-container">
          <p class="caption">${caption || 'No caption provided.'}</p>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <small class="source-toggle" style="cursor:pointer; color:#0078a8; user-select:none;">[source]</small>
            <small class="entry-id" style="font-size: 12px;">
              <a href="database.html?id=${id}" style="color:#888; text-decoration:none;">[${id}]</a>
            </small>
          </div>

          <div class="source-details" style="display:none;">
            <p>${source || 'N/A'}</p>
            ${photographer ? `<p><b>Photographer:</b> ${photographer}</p>` : ''}
          </div>
        </div>

        ${safePhoto ? `<img src="${safePhoto}" style="max-width:100%; border-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); display: block; margin-bottom: 6px;">` : ''}
      `;

      // Add marker to map
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(popupHTML, { maxWidth: 280 });

      // If matches query param, pan and open popup
      if (
        Number.isFinite(targetLat) &&
        Number.isFinite(targetLng) &&
        Math.abs(lat - targetLat) < 0.0001 &&
        Math.abs(lng - targetLng) < 0.0001 &&
        String(id) === String(targetId)
      ) {
        map.setView([lat, lng], 17);
        marker.openPopup();
      }
    });
  } catch (err) {
    console.error('Error fetching markers:', err);
  }
}

fetchAndRenderMarkers();

/* ------------------ Popup behavior ------------------ */
map.on('popupopen', e => {
  const container = e.popup._contentNode.querySelector('.caption-container');
  if (!container) return;

  const caption = container.querySelector('.caption');
  const sourceToggle = container.querySelector('.source-toggle');
  const sourceDetails = container.querySelector('.source-details');

  if (sourceToggle) sourceToggle.style.display = 'inline';
  if (sourceDetails) sourceDetails.style.display = 'none';

  if (sourceToggle && sourceDetails) {
    sourceToggle.onclick = ev => {
      ev.preventDefault();
      sourceDetails.style.display = sourceDetails.style.display === 'block' ? 'none' : 'block';
    };
  }

  if (!caption) return;

  const fullText = caption.innerHTML;
  const needsTruncation = caption.innerText.length > 100;

  let toggle = container.querySelector('.show-more-toggle');
  if (!toggle && needsTruncation) {
    toggle = document.createElement('a');
    toggle.href = '#';
    toggle.className = 'show-more-toggle';
    toggle.style.color = '#0078a8';
    toggle.style.cursor = 'pointer';
    toggle.style.userSelect = 'none';
    toggle.style.fontSize = '13px';
    toggle.innerText = 'Show more';
  }

  if (needsTruncation && toggle) {
    const shortText = fullText.slice(0, 100) + '...';

    caption.innerHTML = shortText;
    caption.appendChild(toggle);
    toggle.innerText = 'Show more';
    if (sourceDetails) sourceDetails.style.display = 'none';

    toggle.onclick = ev => {
      ev.preventDefault();
      const isShort = caption.innerHTML.startsWith(shortText);
      if (isShort) {
        caption.innerHTML = fullText;
        toggle.innerText = 'Show less';
      } else {
        caption.innerHTML = shortText;
        toggle.innerText = 'Show more';
        if (sourceDetails) sourceDetails.style.display = 'none';
      }
      caption.appendChild(toggle);
    };
  }
});