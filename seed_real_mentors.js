const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('database.sqlite');

try {
    const insertUser = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
    const insertProfile = db.prepare(`
        INSERT INTO mentor_profiles 
        (user_id, full_name, phone, email, city, current_role, company, linkedin_url, is_alumni, mentored_previously, past_startups, interests, is_angel, help_areas, domains, effective_stages, engagement_modes, commitment, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Mentor 1
    const pwd1 = bcrypt.hashSync('password123', 10);
    const u1 = insertUser.run('sarah.chen@example.com', pwd1, 'mentor').lastInsertRowid;
    insertProfile.run(
        u1, 'Sarah Chen', '+1 (415) 555-0192', 'sarah.chen@example.com', 'San Francisco',
        'VP of Product', 'Stripe', 'linkedin.com/in/sarahchen', 'No', 'Yes',
        'FinTech Startup (Acquired by Square)', 'Love helping early founders find PMF', 'Yes',
        JSON.stringify(["Product & MVP scoping", "Pricing & monetization"]),
        JSON.stringify(["Fintech", "B2B SaaS"]),
        JSON.stringify(["MVP / Early users", "Early Traction / pilots"]),
        JSON.stringify(["1:1 office hours"]), '2-4 hours total', ''
    );

    // Mentor 2
    const pwd2 = bcrypt.hashSync('password123', 10);
    const u2 = insertUser.run('david.miller@example.com', pwd2, 'mentor').lastInsertRowid;
    insertProfile.run(
        u2, 'David Miller', '+1 (212) 555-0841', 'david.miller@example.com', 'New York',
        'Former CEO / Founder', 'HealthSync', 'linkedin.com/in/davidmiller', 'Yes', 'Yes',
        'HealthSync (Series B)', 'Giving back to the AtoBe community', 'Yes',
        JSON.stringify(["Early GTM & sales", "Fundraising narrative & milestones"]),
        JSON.stringify(["Health / MedTech", "Enterprise IT / Infrastructure"]),
        JSON.stringify(["Ideation / pre-MVP", "Pre-seed fundraising"]),
        JSON.stringify(["Async feedback (docs, questions)", "Group office hours"]), '1-2 hours total', ''
    );

    // Mentor 3
    const pwd3 = bcrypt.hashSync('password123', 10);
    const u3 = insertUser.run('elena.rostova@example.com', pwd3, 'mentor').lastInsertRowid;
    insertProfile.run(
        u3, 'Elena Rostova', '+1 (650) 555-0999', 'elena.rostova@example.com', 'Palo Alto',
        'Director of Engineering', 'OpenAI', 'linkedin.com/in/elenarostova', 'No', 'No',
        'DataVision AI', 'Fascinated by new AI infrastructure startups', 'No',
        JSON.stringify(["Technical architecture / build decisions", "Hiring & team formation"]),
        JSON.stringify(["AI / Data", "Deep Tech"]),
        JSON.stringify(["MVP / Early users"]),
        JSON.stringify(["1:1 office hours"]), '4-6 hours total', ''
    );

    console.log("Successfully seeded realistic mentors");
} catch (e) {
    console.error(e);
}
