require('dotenv').config();
const {
    sendWelcomeEmail,
    sendMenteeRequestEmail,
    sendMentorAcceptedEmail,
    sendMentorDeclinedEmail,
    sendMatchDissolvedEmail,
} = require('./email');

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new Database('database.sqlite');
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    console.error('FATAL: JWT_SECRET is not set in environment variables.');
    process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mentor_profiles (
    user_id INTEGER PRIMARY KEY,
    phone TEXT,
    city TEXT,
    current_role TEXT,
    company TEXT,
    linkedin_url TEXT,
    is_alumni TEXT,
    mentored_previously TEXT,
    past_startups TEXT,
    interests TEXT,
    is_angel TEXT,
    help_areas TEXT,
    domains TEXT,
    effective_stages TEXT,
    engagement_modes TEXT,
    commitment TEXT,
    feedback TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mentee_profiles (
    user_id INTEGER PRIMARY KEY,
    startup_name TEXT,
    founders TEXT,
    current_stage TEXT,
    main_decision TEXT,
    help_areas TEXT,
    success_definition TEXT,
    taken_action TEXT,
    interaction_style TEXT,
    constraints TEXT,
    extra_info TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentee_id INTEGER,
    mentor_id INTEGER,
    status TEXT DEFAULT 'pending',
    confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mentee_id) REFERENCES users(id),
    FOREIGN KEY(mentor_id) REFERENCES users(id)
  );
`);

try { db.exec('ALTER TABLE mentor_profiles ADD COLUMN full_name TEXT'); } catch (e) { }
try { db.exec('ALTER TABLE mentor_profiles ADD COLUMN email TEXT'); } catch (e) { }

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Allowed columns per table for safe dynamic updates
const ALLOWED_MENTOR_COLUMNS = new Set([
    'phone', 'city', 'current_role', 'company', 'linkedin_url', 'is_alumni',
    'mentored_previously', 'past_startups', 'interests', 'is_angel', 'help_areas',
    'domains', 'effective_stages', 'engagement_modes', 'commitment', 'feedback', 'full_name', 'email'
]);
const ALLOWED_MENTEE_COLUMNS = new Set([
    'startup_name', 'founders', 'current_stage', 'main_decision', 'help_areas',
    'success_definition', 'taken_action', 'interaction_style', 'constraints', 'extra_info'
]);

// API Endpoints

// Signup
app.post('/api/signup', async (req, res) => {
    const { email, password, role, fullname } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)').run(email, hashedPassword, role, fullname);
        const token = jwt.sign({ id: result.lastInsertRowid, email, role }, SECRET_KEY);
        sendWelcomeEmail(email, role).catch(err => console.error('Welcome email failed:', err));
        res.json({ token, role, userId: result.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);
    res.json({ token, role: user.role, userId: user.id });
});

// Mentor Profile
app.post('/api/profile/mentor', authenticateToken, (req, res) => {
    const profile = req.body;
    db.prepare(`
        INSERT OR REPLACE INTO mentor_profiles 
        (user_id, phone, city, current_role, company, linkedin_url, is_alumni, mentored_previously, past_startups, interests, is_angel, help_areas, domains, effective_stages, engagement_modes, commitment, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.user.id,
        profile.phone,
        profile.city,
        profile.current_role,
        profile.company,
        profile.linkedin_url,
        profile.is_alumni,
        profile.mentored_previously,
        profile.past_startups,
        profile.interests,
        profile.is_angel,
        JSON.stringify(profile.help_areas),
        JSON.stringify(profile.domains),
        JSON.stringify(profile.effective_stages),
        JSON.stringify(profile.engagement_modes),
        profile.commitment,
        profile.feedback
    );

    res.json({ success: true });
});

// Mentee Profile
app.get('/api/profile/mentee/:id', authenticateToken, (req, res) => {
    const profile = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Mentee not found' });
    res.json(profile);
});

app.post('/api/profile/mentee', authenticateToken, (req, res) => {
    const profile = req.body;
    db.prepare(`
        INSERT OR REPLACE INTO mentee_profiles 
        (user_id, startup_name, founders, current_stage, main_decision, help_areas, success_definition, taken_action, interaction_style, constraints, extra_info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.user.id,
        profile.startup_name,
        profile.founders,
        profile.current_stage,
        profile.main_decision,
        JSON.stringify(profile.help_areas),
        profile.success_definition,
        profile.taken_action,
        profile.interaction_style,
        profile.constraints,
        profile.extra_info
    );

    res.json({ success: true });
});

// Get Current User Profile
app.get('/api/profile/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, email, role, name FROM users WHERE id = ?').get(req.user.id);
    let profile = null;

    if (user.role === 'mentor') {
        profile = db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').get(req.user.id);
    } else {
        profile = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(req.user.id);
    }

    res.json({ user, profile });
});

// Update Profile & User Data
app.post('/api/profile/update', authenticateToken, async (req, res) => {
    const { email, password, ...profileData } = req.body;

    // Whitelist columns to prevent SQL injection via dynamic key names
    const allowedColumns = req.user.role === 'mentor' ? ALLOWED_MENTOR_COLUMNS : ALLOWED_MENTEE_COLUMNS;
    const safeProfileData = Object.fromEntries(
        Object.entries(profileData).filter(([k]) => allowedColumns.has(k))
    );

    const transaction = db.transaction(() => {
        if (email) {
            db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
        }
        if (safeProfileData.full_name) {
            db.prepare('UPDATE users SET name = ? WHERE id = ?').run(safeProfileData.full_name, req.user.id);
        }
        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
        }

        if (Object.keys(safeProfileData).length > 0) {
            const table = req.user.role === 'mentor' ? 'mentor_profiles' : 'mentee_profiles';
            const keys = Object.keys(safeProfileData);
            const sets = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => {
                const val = safeProfileData[k];
                return Array.isArray(val) ? JSON.stringify(val) : val;
            });
            db.prepare(`UPDATE ${table} SET ${sets} WHERE user_id = ?`).run(...values, req.user.id);
        }
    });

    try {
        transaction();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed: ' + err.message });
    }
});

const STAGE_MAPPING = {
    "Ideation (problem & customer still being validated)": ["Ideation / pre-MVP"],
    "MVP built, no real users yet": ["MVP / Early users", "Ideation / pre-MVP"],
    "Early users / pilots": ["MVP / Early users", "Early Traction / pilots"],
    "Early revenue / traction": ["Early Traction / pilots"],
    "Preparing for pre-seed": ["Pre-seed fundraising"],
    "Actively bootstrapping GTM": ["Early Traction / pilots"]
};

const HELP_AREAS_MAPPING = {
    "Customer discovery & ICP clarity": "Customer Discovery & ICP",
    "Product scope & MVP decisions": "Product & MVP scoping",
    "Technical architecture / build tradeoffs": "Technical architecture / build decisions",
    "Early GTM & sales execution": "Early GTM & sales",
    "Pricing & monetization": "Pricing & monetization",
    "Fundraising readiness & milestones": "Fundraising narrative & milestones",
    "Hiring / team structure": "Hiring & team formation",
    "Partnerships or pilots": "Partnerships & Pilots",
    "Regulatory / legal constraints": "Legal / IP / regulation (specialist)"
};

const INTERACTION_MAPPING = {
    "One focused 1:1 conversation": ["1:1 office hours"],
    "A short series (2–3 sessions)": ["1:1 office hours", "Group office hours"],
    "Async feedback on a doc or deck": ["Async feedback (docs, questions)"],
    "Intros are useful after guidance": ["Intros to customers", "Intros to investors"]
};

const calculateMatchScore = (menteeProfile, mentorProfile) => {
    let score = 0;
    let maxScore = 0;

    let menteeHelpAreas = [];
    try { menteeHelpAreas = JSON.parse(menteeProfile.help_areas || '[]'); } catch (e) { }
    const menteeStage = menteeProfile.current_stage || '';
    const menteeInteraction = menteeProfile.interaction_style || '';

    let mentorHelpAreas = [];
    let mentorStages = [];
    let mentorEngagement = [];

    try { mentorHelpAreas = JSON.parse(mentorProfile.help_areas || '[]'); } catch (e) { }
    try { mentorStages = JSON.parse(mentorProfile.effective_stages || '[]'); } catch (e) { }
    try { mentorEngagement = JSON.parse(mentorProfile.engagement_modes || '[]'); } catch (e) { }

    // 1. Stage Score (Max 40)
    maxScore += 40;
    const mappedStages = STAGE_MAPPING[menteeStage] || [];
    if (mappedStages.some(stage => mentorStages.includes(stage))) {
        score += 40;
    }

    // 2. Help Areas Score (Max 40: 20 per matching area)
    maxScore += 40;
    let helpAreaPoints = 0;
    menteeHelpAreas.forEach(area => {
        const mappedArea = HELP_AREAS_MAPPING[area];
        if (mappedArea && mentorHelpAreas.includes(mappedArea)) {
            helpAreaPoints += 20;
        }
    });
    score += Math.min(helpAreaPoints, 40);

    // 3. Interaction Style (Max 20)
    maxScore += 20;
    const mappedInteractions = INTERACTION_MAPPING[menteeInteraction] || [];
    if (mappedInteractions.some(interaction => mentorEngagement.includes(interaction))) {
        score += 20;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};


// Get Matches
app.get('/api/matches', authenticateToken, (req, res) => {
    if (req.user.role === 'mentee') {
        const menteeProfile = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(req.user.id);
        if (!menteeProfile) {
            return res.status(404).json({ error: 'Mentee profile not found' });
        }

        const activeMatch = db.prepare(`
            SELECT m.*, mp.company, mp.current_role, mp.help_areas, mp.domains, mp.past_startups, mp.phone, mp.linkedin_url,
               u.name as mentor_name, u.email
            FROM matches m
            JOIN mentor_profiles mp ON m.mentor_id = mp.user_id
            JOIN users u ON m.mentor_id = u.id
            WHERE m.mentee_id = ? AND m.status IN ('pending', 'confirmed')
        `).get(req.user.id);

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

        const mentors = db.prepare(`
            SELECT mp.* FROM mentor_profiles mp
            WHERE mp.user_id NOT IN (
                SELECT mentor_id FROM matches WHERE status = 'confirmed'
            )
            AND mp.user_id NOT IN (
                SELECT mentor_id FROM matches WHERE mentee_id = ? AND status = 'declined'
            )
        `).all(req.user.id);

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
            };
        });

        scoredMentors.sort((a, b) => b.matchPercentage - a.matchPercentage);
        return res.json(scoredMentors.slice(0, 3));

    } else if (req.user.role === 'mentor') {
        const mentorProfile = db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').get(req.user.id);
        if (!mentorProfile) {
            return res.status(404).json({ error: 'Mentor profile not found' });
        }

        const requests = db.prepare(`
            SELECT m.*, mp.startup_name, mp.founders, mp.current_stage, mp.help_areas, mp.main_decision,
                   u.email as mentee_email
            FROM matches m
            JOIN mentee_profiles mp ON m.mentee_id = mp.user_id
            JOIN users u ON m.mentee_id = u.id
            WHERE m.mentor_id = ? AND m.status IN ('pending', 'confirmed')
        `).all(req.user.id);

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

        const confirmed = results.find(r => r.status === 'confirmed');
        if (confirmed) {
            return res.json([confirmed]);
        }

        return res.json(results);
    }

    return res.status(403).json({ error: 'Invalid role' });
});

// Mentee requests a mentor (creates a pending match waiting for mentor to accept)
app.post('/api/matches/confirm', authenticateToken, (req, res) => {
    const { mentor_id } = req.body;

    if (req.user.role !== 'mentee') {
        return res.status(403).json({ error: 'Only mentees can send match requests' });
    }

    // Block if mentee already has an active match
    const existing = db.prepare(
        `SELECT * FROM matches WHERE mentee_id = ? AND status != 'declined'`
    ).get(req.user.id);
    if (existing) return res.status(400).json({ error: 'You already have an active match' });

    const result = db.prepare(
        `INSERT INTO matches (mentee_id, mentor_id, status) VALUES (?, ?, 'pending')`
    ).run(req.user.id, mentor_id);

    const menteeUser = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
    const mentorUser = db.prepare('SELECT email FROM users WHERE id = ?').get(mentor_id);
    const menteeProf = db.prepare('SELECT founders FROM mentee_profiles WHERE user_id = ?').get(req.user.id);

    sendMenteeRequestEmail(menteeUser.email, mentorUser.email, menteeProf?.founders || 'A Founder')
        .catch(err => console.error('Match request email failed:', err));

    res.json({ success: true, matchId: result.lastInsertRowid });
});

// Mentor accepts a pending match
app.post('/api/matches/accept', authenticateToken, (req, res) => {
    const { match_id } = req.body;

    if (req.user.role !== 'mentor') {
        return res.status(403).json({ error: 'Only mentors can accept matches' });
    }

    const match = db.prepare(
        `SELECT * FROM matches WHERE id = ? AND mentor_id = ?`
    ).get(match_id, req.user.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    db.prepare(
        `UPDATE matches SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(match_id);

    const menteeUser = db.prepare('SELECT email FROM users WHERE id = ?').get(match.mentee_id);
    const mentorUser = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
    const mentorProfile = db.prepare('SELECT linkedin_url FROM mentor_profiles WHERE user_id = ?').get(req.user.id);

    sendMentorAcceptedEmail(
        menteeUser.email,
        mentorUser?.name || 'Your Mentor',
        mentorUser?.email,
        mentorProfile?.linkedin_url
    ).catch(err => console.error('Mentor accept email failed:', err));

    res.json({ success: true });
});

// Mentor declines a pending match
app.post('/api/matches/decline', authenticateToken, (req, res) => {
    const { match_id } = req.body;

    if (req.user.role !== 'mentor') {
        return res.status(403).json({ error: 'Only mentors can decline matches' });
    }

    const match = db.prepare(
        `SELECT * FROM matches WHERE id = ? AND mentor_id = ?`
    ).get(match_id, req.user.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    db.prepare(`UPDATE matches SET status = 'declined' WHERE id = ?`).run(match_id);

    const menteeUser = db.prepare('SELECT email FROM users WHERE id = ?').get(match.mentee_id);
    sendMentorDeclinedEmail(menteeUser.email)
        .catch(err => console.error('Mentor decline email failed:', err));

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});