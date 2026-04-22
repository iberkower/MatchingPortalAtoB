document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('atobeToken');
    const role = localStorage.getItem('atobeRole');

    if (!token) {
        // Only redirect if we are on a protected page
        const protectedPages = ['mentor-dashboard.html', 'mentor-matches.html', 'mentor-profile.html', 'mentee-profile.html', 'profile-settings.html'];
        const currentPage = window.location.pathname.split('/').pop();
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
        return;
    }

    // Update Logo Link to Dashboard
    const logoLink = document.querySelector('.logo');
    if (logoLink) {
        logoLink.href = role === 'mentor' ? 'mentor-dashboard.html' : 'mentor-matches.html';
    }

    const navContainer = document.querySelector('.user-profile-nav');
    if (navContainer) {
        try {
            const response = await fetch('/api/profile/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const displayName = data.role === 'mentor'
                    ? data.profile?.full_name || 'Mentor'
                    : data.profile?.founders || 'Founder';

                navContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <a href="profile-settings.html" style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-dark); text-decoration: none; font-weight: 500;">
                            ${displayName} <span class="avatar-icon" style="background-color: var(--primary-blue); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; width: 24px; height: 24px; border-radius: 50%;">${displayName.charAt(0)}</span>
                        </a>
                        <button onclick="handleLogout()" style="background: none; border: none; color: var(--text-muted); font-size: 12px; cursor: pointer;">Logout</button>
                    </div>
                `;
            }
        } catch (err) {
            console.error('Failed to fetch user profile', err);
        }
    }
});

function handleLogout() {
    localStorage.removeItem('atobeToken');
    localStorage.removeItem('atobeRole');
    localStorage.removeItem('atobeUser');
    window.location.href = 'login.html';
}
