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
  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');

  if (!username) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'No username provided';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/user/${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'User not found' : 'Failed to load profile');
    }

    const userData = await response.json();

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