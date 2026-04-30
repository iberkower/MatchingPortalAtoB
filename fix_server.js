const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const getMenteeProfileRoute = `
app.get('/api/profile/mentee/:id', authenticateToken, (req, res) => {
    // Only mentors can see mentee profiles by ID (or mentees themselves, but they use /me)
    const profile = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Mentee not found' });
    res.json(profile);
});
`;

const requestMenteeRoute = `
app.post('/api/matches/request-mentee', authenticateToken, (req, res) => {
    const { mentee_id } = req.body;
    
    if (req.user.role !== 'mentor') {
        return res.status(403).json({ error: 'Only mentors can send requests to mentees' });
    }

    // Insert the match as pending mentee's acceptance
    const result = db.prepare(
        "INSERT INTO matches (mentee_id, mentor_id, status) VALUES (?, ?, 'pending_mentee')"
    ).run(mentee_id, req.user.id);

    res.json({ success: true, matchId: result.lastInsertRowid });
});
`;

if (!code.includes('/api/profile/mentee/:id')) {
    code = code.replace(
        "app.post('/api/profile/mentee'", 
        getMenteeProfileRoute + "\napp.post('/api/profile/mentee'"
    );
}

if (!code.includes('/api/matches/request-mentee')) {
    code = code.replace(
        "app.post('/api/matches/confirm'", 
        requestMenteeRoute + "\napp.post('/api/matches/confirm'"
    );
}

fs.writeFileSync('server.js', code);
