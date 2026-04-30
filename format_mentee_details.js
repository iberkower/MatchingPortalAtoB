const fs = require('fs');
let code = fs.readFileSync('mentee-details.html', 'utf8');

const replacementHtml = `  <main style="padding: 3rem 2rem; display: flex; justify-content: center; position: relative; z-index: 1;">
    <div style="max-width: 800px; width: 100%; background: white; border: 1px solid var(--border-color); border-radius: 12px; padding: 3rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
        <div>
          <h1 style="font-size: 2rem; color: var(--text-dark); margin-bottom: 0.5rem;" id="ui-startup-name">Startup Name</h1>
          <p style="font-size: 1.125rem; color: var(--text-muted); margin-bottom: 0;" id="ui-founders">Founders</p>
        </div>
        <div style="background-color: var(--primary-blue); color: white; padding: 0.5rem 1rem; border-radius: 999px; font-weight: 600; font-size: 0.875rem;" id="ui-stage">Stage</div>
      </div>

      <div style="margin-bottom: 2.5rem;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-dark);">Core Challenge / Pivot</h2>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 1.05rem;" id="ui-challenge">No challenge specified.</p>
      </div>

      <div style="margin-bottom: 2.5rem;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-dark);">What Have They Already Tried?</h2>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 1.05rem;" id="ui-action-taken">No actions specified.</p>
      </div>

      <div style="margin-bottom: 2.5rem;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-dark);">Definition of Success with a Mentor</h2>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 1.05rem;" id="ui-success">No definition specified.</p>
      </div>
      
      <div style="margin-bottom: 2.5rem;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-dark);">Additional Info / Goals</h2>
        <p style="color: var(--text-muted); line-height: 1.6; font-size: 1.05rem;" id="ui-extra">None.</p>
      </div>

      <div style="margin-bottom: 3rem;">
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-dark);">Requested Areas of Mentorship</h2>
        <div class="pills-container" id="ui-help-areas">
          <!-- Populated via JS -->
        </div>
      </div>

      <a href="mentor-dashboard.html" class="btn btn-outline btn-block" style="text-align: center;">Go Back</a>

    </div>
  </main>`;

const jsUpdates = `
        const sName = profile.startup_name || 'Anonymous Startup';
        document.getElementById('ui-startup-name').textContent = sName;
        document.getElementById('ui-founders').textContent = profile.founders ? 'Founded by ' + profile.founders : 'Founders unlisted';
        document.getElementById('ui-stage').textContent = profile.current_stage || 'Unknown Stage';
        
        document.getElementById('ui-challenge').textContent = profile.main_decision || 'No information provided.';
        document.getElementById('ui-action-taken').textContent = profile.taken_action || 'No information provided.';
        document.getElementById('ui-success').textContent = profile.success_definition || 'No information provided.';
        
        let extra = [];
        if (profile.goals) extra.push(profile.goals);
        if (profile.extra_info) extra.push(profile.extra_info);
        document.getElementById('ui-extra').textContent = extra.length > 0 ? extra.join('\\n\\n') : 'No additional information provided.';

        const skillsContainer = document.getElementById('ui-help-areas');
        if (skillsContainer) {
          skillsContainer.innerHTML = '';
          let helpAreas = [];
          try { helpAreas = JSON.parse(profile.help_areas || '[]'); } catch(e){}
          if (helpAreas.length > 0) {
              helpAreas.forEach(area => {
                  skillsContainer.innerHTML += \\\`<div class="pill active" style="pointer-events: none;">\${area}</div>\\\`;
              });
          } else {
              skillsContainer.innerHTML = '<i style="color: var(--text-muted);">No specific skills selected</i>';
          }
        }
`;

let newCode = code.replace(/<main[\s\S]*?<\/main>/, replacementHtml);

// Remove the old document.getElementById('startup-name... logic
newCode = newCode.replace(/\/\/ Map data to DOM elements based on IDs in the HTML[\s\S]*? \/\/ Format skills\/help areas as active pills[\s\S]*?\}\n        \}/, '// Map data to DOM elements based on IDs in the HTML\n' + jsUpdates.replace(/\\\\\\`/g, "`"));

fs.writeFileSync('mentee-details.html', newCode);
