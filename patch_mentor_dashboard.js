const fs = require('fs');
let code = fs.readFileSync('mentor-dashboard.html', 'utf8');

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
          throw new Error('Failed to fetch requests');
        }

        const data = await response.json();

        if (data.length === 0) {
          title.textContent = "Your Dashboard";
          subtitle.textContent = "You are currently waiting on getting requests from mentees. When you get a request, it will appear here!";
          container.innerHTML = "";
          return;
        }

        container.innerHTML = "";

        // Check if there is a confirmed match
        const confirmedMatch = data.find(m => m.status === 'confirmed');
        if (confirmedMatch) {
            title.textContent = "Your Mentee Match";
            subtitle.textContent = "You have successfully securely matched! Please reach out to your mentee to schedule a meeting.";
            
            let helpAreasStr = "Mentorship";
            try {
                const helpAreas = JSON.parse(confirmedMatch.help_areas || '[]');
                if (helpAreas.length > 0) helpAreasStr = helpAreas.join(', ');
            } catch (e) {}

            const card = \`
              <div class="request-card" style="position: relative; margin-bottom: 2rem;">
                <div class="match-header"
                  style="border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
                  <div class="match-avatar" style="width: 56px; height: 56px;"></div>
                  <div>
                    <h2 style="font-size: 1.125rem; margin-bottom: 0;">\${confirmedMatch.startup_name || 'Anonymous Startup'}</h2>
                    <span class="text-muted" style="font-size: 0.875rem;">\${confirmedMatch.current_stage || 'Unknown stage'}</span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                  <div>
                    <div class="match-info-label">Founders</div>
                    <div class="match-info-value">\${confirmedMatch.founders || 'N/A'}</div>
                  </div>
                  <div style="grid-column: span 2;">
                    <div class="match-info-label">Looking For Help With</div>
                    <div class="match-info-value">\${helpAreasStr}</div>
                  </div>
                  <div style="grid-column: span 2;">
                    <div class="match-info-label">Contact / Email</div>
                    <div class="match-info-value">\${confirmedMatch.email || 'N/A'}</div>
                  </div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                  <a href="mentee-details.html?id=\${confirmedMatch.id}" class="btn btn-outline" style="flex: 1;">View Full Answers</a>
                </div>
              </div>
            \`;
            container.innerHTML = card;
            return;
        }

        // Otherwise, these are pending requests
        title.textContent = "Pending Mentee Requests";
        subtitle.textContent = \`You have \${data.length} pending request(s) waiting for your review.\`;

        data.forEach(req => {
          let helpAreasStr = "Mentorship";
          try {
            const helpAreas = JSON.parse(req.help_areas || '[]');
            if (helpAreas.length > 0) helpAreasStr = helpAreas.join(', ');
          } catch (e) { }

          const card = \`
              <div class="request-card" style="position: relative; margin-bottom: 2rem;">
                <div class="badge-new" style="background-color: var(--primary-blue); color: white;">Pending your approval</div>

                <div class="match-header"
                  style="border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
                  <div class="match-avatar" style="width: 56px; height: 56px;"></div>
                  <div>
                    <h2 style="font-size: 1.125rem; margin-bottom: 0;">\${req.startup_name || 'Anonymous Startup'}</h2>
                    <span class="text-muted" style="font-size: 0.875rem;">\${req.founders || 'Founders Name'} • \${req.current_stage || ''}</span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                  <div style="grid-column: span 2;">
                    <div class="match-info-label">Looking For Help With</div>
                    <div class="match-info-value">\${helpAreasStr}</div>
                  </div>
                  <div style="grid-column: span 2;">
                    <div class="match-info-label">Main Decision / Challenge</div>
                    <div class="match-info-value">\${req.main_decision || 'N/A'}</div>
                  </div>
                </div>

                <div style="display: flex; gap: 1rem;">
                  <button class="btn btn-success" style="flex: 2;" onclick="respondToRequest(\${req.match_id}, 'accept', this)">✓ Accept Request</button>
                  <button class="btn btn-outline" style="flex: 1; border-color: red; color: red;" onclick="respondToRequest(\${req.match_id}, 'decline', this)">Decline</button>
                  <a href="mentee-details.html?id=\${req.id}" class="btn btn-outline" style="flex: 1;">More Info</a>
                </div>
              </div>
            \`;
          container.innerHTML += card;
        });

      } catch (err) {
        console.error(err);
        subtitle.textContent = "An error occurred while loading your matches.";
      }
    });
  
    async function respondToRequest(matchId, action, buttonEl) {
      if (buttonEl.disabled) return;
      buttonEl.disabled = true;
      const originalText = buttonEl.textContent;
      buttonEl.textContent = "...";
      
      const token = localStorage.getItem('atobeToken');
      try {
        const route = action === 'accept' ? '/api/matches/accept' : '/api/matches/decline';
        const res = await fetch(route, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ match_id: matchId })
        });
        
        if (!res.ok) {
          throw new Error('Failed to ' + action + ' request');
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
    fs.writeFileSync('mentor-dashboard.html', code);
}
