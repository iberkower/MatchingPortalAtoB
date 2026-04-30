const fs = require('fs');
let code = fs.readFileSync('mentor-matches.html', 'utf8');

const pendingHtml = `                const card = \\\`
                  <div class="match-card" style="border: 2px solid var(--primary-blue); grid-column: 1 / -1; max-width: 650px; margin: 0 auto; box-shadow: 0 10px 25px rgba(37,99,235,0.1); display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3rem 2rem;">
                    
                    <div style="width: 64px; height: 64px; border-radius: 50%; background-color: #EEF2FF; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>

                    <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--primary-blue);">Pending Acceptance</h2>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Your connection request has been sent to your chosen mentor. We will email you once they review it.</p>

                    <div style="width: 100%; border-top: 1px solid var(--border-color); padding-top: 2rem; margin-top: auto;">
                      <h3 style="font-size: 1.125rem; margin-bottom: 0;">Anonymous Mentor</h3>
                      <span class="text-muted" style="font-size: 0.875rem;">\${match.current_role} at \${match.company}</span>
                    </div>
                  </div>
                \\\`;`;

const confirmedHtml = `                const card = \\\`
                  <div class="match-card" style="border: 2px solid #10B981; grid-column: 1 / -1; max-width: 650px; margin: 0 auto; box-shadow: 0 10px 25px rgba(16,185,129,0.1); padding: 3rem 2rem; text-align: center;">
                    
                    <div style="width: 64px; height: 64px; border-radius: 50%; background-color: #D1FAE5; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>

                    <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: #10B981;">Match Confirmed!</h2>
                    <p style="color: var(--text-muted); margin-bottom: 2.5rem;">Your mentor will reach out to you shortly to schedule your first meeting. Keep an eye on your inbox.</p>

                    <div style="background-color: #F9FAFB; border-radius: 12px; padding: 2rem; text-align: left;">
                      <h3 style="font-size: 1.25rem; margin-bottom: 0.25rem;">\${match.mentor_name}</h3>
                      <span class="text-muted" style="font-size: 0.875rem; display: block; margin-bottom: 1.5rem;">\${match.current_role} at \${match.company}</span>
                      
                      <div class="match-info-section">
                        <div class="match-info-label">Email</div>
                        <div class="match-info-value" style="font-weight: 500;">\${match.email || 'N/A'}</div>
                      </div>
                      <div class="match-info-section">
                        <div class="match-info-label">Phone</div>
                        <div class="match-info-value" style="font-weight: 500;">\${match.phone || 'N/A'}</div>
                      </div>
                      \${match.linkedin_url ? \\\`<a href="\${match.linkedin_url}" target="_blank" style="color: var(--primary-blue); font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> View Profile</a>\\\` : ''}
                    </div>
                  </div>
                \\\`;`;

let updatedCode = code;

updatedCode = updatedCode.replace(
    /const card = `[\s\S]*?Pending Mentor's Acceptance[\s\S]*?`;/,
    pendingHtml.replace(/\\\\\\`/g, "`")
);

updatedCode = updatedCode.replace(
    /const card = `[\s\S]*?Match Confirmed![\s\S]*?`;/,
    confirmedHtml.replace(/\\\\\\`/g, "`")
);

fs.writeFileSync('mentor-matches.html', updatedCode);
