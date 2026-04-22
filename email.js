const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
//service: 'gmail',
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Welcome email when a user signs up
async function sendWelcomeEmail(toEmail, role) {
  const isMentor = role === 'mentor';
  await transporter.sendMail({
    from: `"AtoBe Startups" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Welcome to AtoBe Startups!',
    html: `
      <h2>Welcome to AtoBe Startups!</h2>
      <p>Thanks for joining as a <strong>${isMentor ? 'Mentor' : 'Mentee'}</strong>.</p>
      <p>${isMentor
        ? 'Complete your mentor profile so we can start matching you with founders.'
        : 'Complete your profile and we\'ll find you the best mentor match.'
      }</p>
    `,
  });
}

// Sent to mentee + mentor when a match is confirmed
async function sendMatchConfirmedEmail(menteeEmail, mentorEmail, mentorName) {
  // Email to mentee
  await transporter.sendMail({
    from: `"AtoBe Startups" <${process.env.EMAIL_USER}>`,
    to: menteeEmail,
    subject: "You've confirmed your mentor match!",
    html: `
      <h2>Match Confirmed 🎉</h2>
      <p>You've been matched with <strong>${mentorName}</strong>.</p>
      <p>Your mentor will reach out to schedule your first meeting. Keep an eye on your inbox!</p>
    `,
  });

  // Email to mentor
  await transporter.sendMail({
    from: `"AtoBe Startups" <${process.env.EMAIL_USER}>`,
    to: mentorEmail,
    subject: 'A mentee has selected you!',
    html: `
      <h2>You have a new mentee!</h2>
      <p>A founder has selected you as their mentor on AtoBe Startups.</p>
      <p>Log in to your dashboard to view their request and accept or decline.</p>
    `,
  });
}

// Sent to mentee when mentor accepts
async function sendMentorAcceptedEmail(menteeEmail, mentorName, mentorEmail, mentorLinkedin) {
  await transporter.sendMail({
    from: `"AtoBe Startups" <${process.env.EMAIL_USER}>`,
    to: menteeEmail,
    subject: `${mentorName} accepted your connection!`,
    html: `
      <h2>Your mentor accepted! 🙌</h2>
      <p><strong>${mentorName}</strong> has accepted your connection request.</p>
      <p>Reach out to schedule your first meeting:</p>
      <ul>
        <li>Email: <a href="mailto:${mentorEmail}">${mentorEmail}</a></li>
        ${mentorLinkedin ? `<li>LinkedIn: <a href="${mentorLinkedin}">${mentorLinkedin}</a></li>` : ''}
      </ul>
    `,
  });
}

// Sent to mentee when mentor declines
async function sendMentorDeclinedEmail(menteeEmail) {
  await transporter.sendMail({
    from: `"AtoBe Startups" <${process.env.EMAIL_USER}>`,
    to: menteeEmail,
    subject: 'Update on your mentor request',
    html: `
      <h2>Mentor Update</h2>
      <p>Unfortunately, your selected mentor wasn't able to take on a new mentee at this time.</p>
      <p>Head back to your dashboard to select another mentor from your matches.</p>
    `,
  });
}

// Sent when a match is dissolved or a user is removed
async function sendMatchDissolvedEmail(toEmail) {
  await transporter.sendMail({
    from: `"AtoBe Startups" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your AtoBe match has ended',
    html: `
      <h2>Match Update</h2>
      <p>Your current mentorship match on AtoBe Startups has ended.</p>
      <p>If you have questions, please reach out to the program administrator.</p>
    `,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendMatchConfirmedEmail,
  sendMentorAcceptedEmail,
  sendMentorDeclinedEmail,
  sendMatchDissolvedEmail,
};