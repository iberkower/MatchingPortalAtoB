const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

try {
    const insert = db.prepare(`
    INSERT OR REPLACE INTO mentor_profiles 
    (user_id, full_name, phone, email, city, current_role, company, linkedin_url, is_alumni, mentored_previously, past_startups, interests, is_angel, help_areas, domains, effective_stages, engagement_modes, commitment, feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    insert.run(
        11,
        'Test Mentor',
        '1234567890',
        'mentor_test@example.com',
        'NY',
        'CTO',
        'Test Corp',
        'linkedin.com/in/test',
        'Yes',
        'Yes',
        'Past Startup',
        'Tech',
        'No',
        JSON.stringify(["Product & MVP scoping"]),
        JSON.stringify(["SaaS"]),
        JSON.stringify(["MVP / Early users"]),
        JSON.stringify(["1:1 office hours"]),
        '2 hours',
        ''
    );
    console.log("Profile created");
} catch(e) {
    console.error(e);
}
