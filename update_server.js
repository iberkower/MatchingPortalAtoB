const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const getMatchesRoute = `
// Get Matches
app.get('/api/matches', authenticateToken, (req, res) => {
    if (req.user.role === 'mentee') {
        const menteeProfile = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(req.user.id);
        if (!menteeProfile) {
             return res.status(404).json({ error: 'Mentee profile not found' });
        }

        // First, check if there's an active or pending match for this mentee
        const activeMatch = db.prepare(\`
            SELECT m.*, mp.full_name as mentor_name, mp.company, mp.current_role, mp.help_areas, mp.domains, mp.past_startups, mp.email, mp.phone, mp.linkedin_url
            FROM matches m
            JOIN mentor_profiles mp ON m.mentor_id = mp.user_id
            WHERE m.mentee_id = ? AND m.status IN ('pending', 'confirmed')
        \`).get(req.user.id);

        if (activeMatch) {
            return res.json([{
                id: activeMatch.mentor_id,
                match_id: activeMatch.id,
                status: activeMatch.status,
                mentor_name: activeMatch.mentor_name,
                company: activeMatch.company,
                current_role: activeMatch.current_role,
                domains: activeMatch.domains,
                experience: activeMatch.past_startups || activeMatch.company,
                skills: activeMatch.help_areas,
                email: activeMatch.status === 'confirmed' ? activeMatch.email : null,
                phone: activeMatch.status === 'confirmed' ? activeMatch.phone : null,
                linkedin_url: activeMatch.status === 'confirmed' ? activeMatch.linkedin_url : null
            }]);
        }

        // Otherwise, get top 3 unmatched mentors who haven't declined this mentee
        const mentors = db.prepare(\`
            SELECT mp.* FROM mentor_profiles mp
            WHERE mp.user_id NOT IN (
                SELECT mentor_id FROM matches WHERE status = 'confirmed'
            )
            AND mp.user_id NOT IN (
                SELECT mentor_id FROM matches WHERE mentee_id = ? AND status = 'declined'
            )
        \`).all(req.user.id);
        
        const scoredMentors = mentors.map(mentor => {
            const matchPercentage = calculateMatchScore(menteeProfile, mentor);
            return {
                id: mentor.user_id,
                matchPercentage,
                company: mentor.company,
                current_role: mentor.current_role,
                domains: mentor.domains,
                experience: mentor.past_startups || mentor.company,
                skills: mentor.help_areas,
                status: 'unmatched'
            }; // note: completely anonymous (no name, email, etc. returned)
        });

        scoredMentors.sort((a, b) => b.matchPercentage - a.matchPercentage);
        return res.json(scoredMentors.slice(0, 3));
        
    } else if (req.user.role === 'mentor') {
        const mentorProfile = db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').get(req.user.id);
        if (!mentorProfile) {
             return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const requests = db.prepare(\`
            SELECT m.*, mp.startup_name, mp.founders, mp.current_stage, mp.help_areas, mp.main_decision,
                   u.email as mentee_email
            FROM matches m
            JOIN mentee_profiles mp ON m.mentee_id = mp.user_id
            JOIN users u ON m.mentee_id = u.id
            WHERE m.mentor_id = ? AND m.status IN ('pending', 'confirmed')
        \`).all(req.user.id);
        
        const results = requests.map(reqMatch => {
            const menteeProfileObj = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(reqMatch.mentee_id);
            const matchPercentage = calculateMatchScore(menteeProfileObj, mentorProfile);
            return {
                id: reqMatch.mentee_id,
                match_id: reqMatch.id,
                status: reqMatch.status,
                matchPercentage,
                startup_name: reqMatch.startup_name,
                founders: reqMatch.founders,
                current_stage: reqMatch.current_stage,
                help_areas: reqMatch.help_areas,
                main_decision: reqMatch.main_decision,
                email: reqMatch.status === 'confirmed' ? reqMatch.mentee_email : null
            };
        });

        // if there's a confirmed match, just return it
        const confirmed = results.find(r => r.status === 'confirmed');
        if (confirmed) {
            return res.json([confirmed]);
        }

        // otherwise return all pending requests
        return res.json(results);
    }

    return res.status(403).json({ error: 'Invalid role' });
});
`;

let matchesStart = code.indexOf("// Get Matches");
let matchesEnd = code.indexOf("app.post('/api/matches/request-mentee'");

if (matchesStart !== -1 && matchesEnd !== -1) {
    code = code.substring(0, matchesStart) + getMatchesRoute + code.substring(matchesEnd);
}

fs.writeFileSync('server.js', code);
