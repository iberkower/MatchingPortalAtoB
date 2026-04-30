const fs = require('fs');
let code = fs.readFileSync('mentor-matches.html', 'utf8');

const replacementJs = `
  <script src="auth-shared.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async () => {
      const token = localStorage.getItem('atobeToken');
      if (!token) {
        window.location.href = 'login.html';
        return;
      }

      const container = document.getElementById('matches-container');
      const subtitle = document.getElementById('matches-subtitle');
      const title = document.querySelector('h1');

      try {
        const response = await fetch('/api/matches', {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch matches');
        }

        const data = await response.json();

        if (data.length === 0) {
          subtitle.textContent = "We couldn't find any mentors that match your profile yet. We'll update you when we do!";
          container.innerHTML = "";
          return;
        }

        container.innerHTML = "";

        // Check if there is a pending or confirmed match
        const activeMatch = data[0].status === 'pending' || data[0].status === 'confirmed';
        
        if (activeMatch) {
            const match = data[0];
            title.textContent = "Your Mentor";
            
            if (match.status === 'pending') {
                subtitle.textContent = "Your request has been sent! We are waiting on your mentor to accept it.";
                
                const card = \`
                  <div class="match-card" style="border: 2px solid var(--primary-blue); grid-column: 1 / -1; max-width: 600px; margin: 0 auto;">
                    <div class="match-badge" style="background-color: var(--primary-blue); color: white;">Pending Mentor's Acceptance</div>
                    <div class="match-header">
                      <div class="match-avatar"></div>
                      <div>
                        <h3 style="margin-bottom: 0;">Anonymous Mentor</h3>
                        <span class="text-muted" style="font-size: 0.875rem;">\${match.current_role} at \${match.company}</span>
                      </div>
                    </div>
                  </div>
                \`;
                container.innerHTML = card;
            } else if (match.status === 'confirmed') {
                subtitle.textContent = "You have been matched successfully! You will be reached out to by your mentor to schedule your first meeting.";
                
                const card = \`
                  <div class="match-card" style="border: 2px solid green; grid-column: 1 / -1; max-width: 600px; margin: 0 auto;">
                    <div class="match-badge" style="background-color: green; color: white;">Match Confirmed!</div>
                    <div class="match-header">
                      <div class="match-avatar"></div>
                      <div>
                        <h3 style="margin-bottom: 0;">\${match.mentor_name}</h3>
                        <span class="text-muted" style="font-size: 0.875rem;">\${match.current_role} at \${match.company}</span>
                      </div>
                    </div>
                    
                    <div style="flex: 1; margin-top: 1rem;">
                      <div class="match-info-section">
                        <div class="match-info-label">Mentor Contact Info</div>
                        <div class="match-info-value">\${match.email || 'N/A'}</div>
                        <div class="match-info-value">\${match.phone || 'N/A'}</div>
                        <div class="match-info-value">\${match.linkedin_url || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                \`;
                container.innerHTML = card;
            }
            return;
        }

        // Display unmatched mentors
        subtitle.textContent = \`We found \${data.length} mentors who are unmatched and align with your profile. Select one!\`;

        data.forEach((match, index) => {
            let domainsStr = "General";
            try {
                const domains = JSON.parse(match.domains || '[]');
                if (domains.length > 0) domainsStr = domains.slice(0,2).join(', ');
            } catch(e){}

            let skillsStr = "Mentorship";
            try {
                const skills = JSON.parse(match.skills || '[]');
                if (skills.length > 0) skillsStr = skills.slice(0,3).join(' &middot; ');
            } catch(e){}

            const isTopMatch = index === 0;
            const borderStyle = isTopMatch ? 'style="border: 2px solid var(--primary-blue);"' : '';
            const badgeStyle = isTopMatch ? 'style="background-color: var(--primary-blue); color: white;"' : '';

            const card = \`
              <div class="match-card" \${borderStyle}>
                <div class="match-badge" \${badgeStyle}>\${match.matchPercentage}% match</div>
                <div class="match-header">
                  <div class="match-avatar"></div>
                  <div>
                    <h3 style="margin-bottom: 0;">Mentor #\${index + 1}</h3>
                    <span class="text-muted" style="font-size: 0.875rem;">\${domainsStr}</span>
                  </div>
                </div>

                <div style="flex: 1;">
                  <div class="match-info-section">
                    <div class="match-info-label">Current Role</div>
                    <div class="match-info-value">\${match.current_role} at \${match.company}</div>
                  </div>
                  <div class="match-info-section">
                    <div class="match-info-label">Background</div>
                    <div class="match-info-value">\${match.experience || 'N/A'}</div>
                  </div>
                  <div class="match-info-section">
                    <div class="match-info-label">Key Skills</div>
                    <div class="match-info-value">\${skillsStr}</div>
                  </div>
                </div>

                <button class="btn btn-primary btn-block" style="margin-top: 1rem;" onclick="requestMentor(\${match.id}, this)">Select This Mentor</button>
              </div>
            \`;
            container.innerHTML += card;
        });

      } catch (err) {
        console.error(err);
        subtitle.textContent = "An error occurred while loading your matches.";
      }
    });
    
    async function requestMentor(mentorId, buttonEl) {
      if (buttonEl.disabled) return;
      buttonEl.disabled = true;
      const originalText = buttonEl.textContent;
      buttonEl.textContent = "Requesting...";
      
      const token = localStorage.getItem('atobeToken');
      try {
        const res = await fetch('/api/matches/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ mentor_id: mentorId })
        });
        
        if (!res.ok) {
          throw new Error('Failed to request mentor');
        }
        
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
        buttonEl.disabled = false;
        buttonEl.textContent = originalText;
      }
    }
  </script>
</body>
`;

const jsStart = code.indexOf("<script src=\"auth-shared.js\"></script>");
if (jsStart !== -1) {
    code = code.substring(0, jsStart) + replacementJs;
    fs.writeFileSync('mentor-matches.html', code);
}
