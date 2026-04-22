const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new Database('database.sqlite');
const PORT = 3000;
const SECRET_KEY = 'atobe-secret-key'; // In production, use environment variables

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mentor_profiles (
    user_id INTEGER PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    email TEXT,
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
`);

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

// API Endpoints

// Signup
app.post('/api/signup', async (req, res) => {
    const { email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const insert = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        const result = insert.run(email, hashedPassword, role);
        const token = jwt.sign({ id: result.lastInsertRowid, email, role }, SECRET_KEY);
        res.json({ token, role, userId: result.lastInsertRowid });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
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
    const insert = db.prepare(`
    INSERT OR REPLACE INTO mentor_profiles 
    (user_id, full_name, phone, email, city, current_role, company, linkedin_url, is_alumni, mentored_previously, past_startups, interests, is_angel, help_areas, domains, effective_stages, engagement_modes, commitment, feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insert.run(
        req.user.id,
        profile.full_name,
        profile.phone,
        profile.email,
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
app.post('/api/profile/mentee', authenticateToken, (req, res) => {
    const profile = req.body;
    const insert = db.prepare(`
    INSERT OR REPLACE INTO mentee_profiles 
    (user_id, startup_name, founders, current_stage, main_decision, help_areas, success_definition, taken_action, interaction_style, constraints, extra_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insert.run(
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
    const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.user.id);
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

    // Start a transaction
    const transaction = db.transaction(() => {
        // Update user table
        if (email) {
            db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
        }
        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
        }

        // Update profile table
        if (req.user.role === 'mentor') {
            const keys = Object.keys(profileData);
            const sets = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => {
                const val = profileData[k];
                return Array.isArray(val) ? JSON.stringify(val) : val;
            });
            db.prepare(`UPDATE mentor_profiles SET ${sets} WHERE user_id = ?`).run(...values, req.user.id);
        } else {
            const keys = Object.keys(profileData);
            const sets = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => {
                const val = profileData[k];
                return Array.isArray(val) ? JSON.stringify(val) : val;
            });
            db.prepare(`UPDATE mentee_profiles SET ${sets} WHERE user_id = ?`).run(...values, req.user.id);
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

// Get Mentor Matches
app.get('/api/matches', authenticateToken, (req, res) => {
    if (req.user.role !== 'mentee') {
        return res.status(403).json({ error: 'Only mentees can view matches' });
    }

    const menteeProfile = db.prepare('SELECT * FROM mentee_profiles WHERE user_id = ?').get(req.user.id);
    if (!menteeProfile) {
         return res.status(404).json({ error: 'Mentee profile not found' });
    }

    const mentors = db.prepare('SELECT * FROM mentor_profiles').all();
    
    let menteeHelpAreas = [];
    try { menteeHelpAreas = JSON.parse(menteeProfile.help_areas || '[]'); } catch(e) {}
    const menteeStage = menteeProfile.current_stage || '';
    const menteeInteraction = menteeProfile.interaction_style || '';

    const scoredMentors = mentors.map(mentor => {
        let score = 0;
        let maxScore = 0;

        let mentorHelpAreas = [];
        let mentorStages = [];
        let mentorEngagement = [];
        
        try { mentorHelpAreas = JSON.parse(mentor.help_areas || '[]'); } catch(e) {}
        try { mentorStages = JSON.parse(mentor.effective_stages || '[]'); } catch(e) {}
        try { mentorEngagement = JSON.parse(mentor.engagement_modes || '[]'); } catch(e) {}

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

        const matchPercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        
        return {
            id: mentor.user_id,
            matchPercentage,
            company: mentor.company,
            current_role: mentor.current_role,
            domains: mentor.domains,
            experience: mentor.past_startups || mentor.company,
            skills: mentor.help_areas
        };
    });

    scoredMentors.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const topMatches = scoredMentors.slice(0, 3);

    res.json(topMatches);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


