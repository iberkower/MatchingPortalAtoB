const fs = require('fs');
let code = fs.readFileSync('mentee-details.html', 'utf8');

const jsFunc = `
  <script src="auth-shared.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      
      if (!id) {
        alert("No mentee ID provided.");
        window.location.href = 'mentor-dashboard.html';
        return;
      }
      
      const token = localStorage.getItem('atobeToken');
      if (!token) {
        window.location.href = 'login.html';
        return;
      }
      
      try {
        const res = await fetch('/api/profile/mentee/' + id, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!res.ok) {
           throw new Error("Failed to load mentee profile");
        }
        
        const profile = await res.json();
        
        // Map data to DOM elements based on IDs in the HTML
        document.getElementById('startup-name').value = profile.startup_name || '';
        document.getElementById('startup-stage').innerHTML = \`<option>\${profile.current_stage || ''}</option>\`;
        document.getElementById('challenge').value = profile.main_decision || '';
        document.getElementById('action-taken').value = profile.taken_action || '';
        document.getElementById('success').value = profile.success_definition || '';
        document.getElementById('goals').value = profile.goals || ''; // If present
        document.getElementById('help-match').value = profile.extra_info || '';

        // If founders string exists, potentially put it in full name
        const fullnameEl = document.getElementById('fullname');
        if (fullnameEl) fullnameEl.value = profile.founders || '';
        
        // Format skills/help areas as active pills
        const skillsContainer = document.querySelector('.pills-container');
        if (skillsContainer) {
          skillsContainer.innerHTML = '';
          let helpAreas = [];
          try { helpAreas = JSON.parse(profile.help_areas || '[]'); } catch(e){}
          if (helpAreas.length > 0) {
              helpAreas.forEach(area => {
                  skillsContainer.innerHTML += \`<div class="pill active">\${area}</div>\`;
              });
          } else {
              skillsContainer.innerHTML = '<i>No specific skills selected</i>';
          }
        }
        
      } catch (e) {
        console.error(e);
        alert("Could not load mentee details.");
      }
    });
  </script>
</body>
`;

code = code.replace("</body>", jsFunc);
fs.writeFileSync('mentee-details.html', code);
