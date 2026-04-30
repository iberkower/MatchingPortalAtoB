const fs = require('fs');
let code = fs.readFileSync('email.js', 'utf8');

const newEmails = `
// Sent when Mentee requests a Mentor
async function sendMenteeRequestEmail(menteeEmail, mentorEmail, menteeName) {
  // Email to mentee
  await transporter.sendMail({
    from: '"AtoBe Startups" <' + process.env.EMAIL_USER + '>',
    to: menteeEmail,
    subject: "Request sent to Mentor!",
    html: \`
      <h2>Request Sent! ⏳</h2>
      <p>We've sent your request to your chosen mentor.</p>
      <p>We'll let you know as soon as they accept or decline.</p>
    \`,
  });

  // Email to mentor
  await transporter.sendMail({
    from: '"AtoBe Startups" <' + process.env.EMAIL_USER + '>',
    to: mentorEmail,
    subject: 'New mentorship request from ' + menteeName,
    html: \`
      <h2>You have a new mentee request!</h2>
      <p><strong>\${menteeName}</strong> has selected you as a potential mentor on AtoBe Startups.</p>
      <p>Log in to your dashboard to view their profile and accept or decline their request.</p>
    \`,
  });
}
`;

code = code.replace("module.exports = {", newEmails + "\nmodule.exports = {\n  sendMenteeRequestEmail,");
fs.writeFileSync('email.js', code);

// Now patch server.js to use sendMenteeRequestEmail
let serverCode = fs.readFileSync('server.js', 'utf8');
serverCode = serverCode.replace(
    /const {\n\s*sendWelcomeEmail,/g,
    "const {\n  sendWelcomeEmail,\n  sendMenteeRequestEmail,"
);

serverCode = serverCode.replace(
    /sendMatchConfirmedEmail\(menteeUser\.email, mentorUser\.email, mentorProfile\?\.full_name \|\| 'Your Mentor'\)/,
    "const menteeProf = db.prepare('SELECT founders FROM mentee_profiles WHERE user_id = ?').get(req.user.id);\n    sendMenteeRequestEmail(menteeUser.email, mentorUser.email, menteeProf?.founders || 'A Founder')"
);
fs.writeFileSync('server.js', serverCode);
