import { API_BASE_URL } from './config.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadUserProfile() {
  // Extract username from URL path (/user/hasan) OR query param (?username=hasan)
  let username = null;
  
  // Method 1: Check URL path
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'user' && pathParts[1]) {
    username = pathParts[1];
  }
  
  // Method 2: Check query parameter (fallback)
  if (!username) {
    const params = new URLSearchParams(window.location.search);
    username = params.get('username');
  }

  console.log('Extracted username:', username); // Debug log

  if (!username) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'No username provided';
    return;
  }

  try {
    const apiUrl = `${API_BASE_URL}/api/user/${encodeURIComponent(username)}`;
    console.log('Fetching from:', apiUrl); // Debug log
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'User not found' : 'Failed to load profile');
    }

    const userData = await response.json();
    console.log('User data:', userData); // Debug log

    // Update page title
    document.title = `@${userData.username}'s Profile`;

    // Populate profile
    document.getElementById('avatar-letter').textContent = userData.username.charAt(0).toUpperCase();
    document.getElementById('username').textContent = `@${escapeHtml(userData.username)}`;
    
    const joinedDate = userData.created_at 
      ? new Date(userData.created_at).toDateString()
      : 'Unknown';
    document.getElementById('joined-date').textContent = joinedDate;
    
    document.getElementById('bio-text').textContent = userData.bio || 'No bio yet.';
    document.getElementById('submission-count').textContent = userData.submissionCount;
    document.getElementById('view-submissions').href = `/database.html?uploader=${encodeURIComponent(userData.username)}`;

    // Show profile, hide loading
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';

  } catch (err) {
    console.error('Error loading profile:', err);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = err.message;
  }
}

document.addEventListener('DOMContentLoaded', loadUserProfile);