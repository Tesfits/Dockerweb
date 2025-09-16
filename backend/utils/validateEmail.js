const allowedDomains = ['fortigrid.com', 'fortigrid.in', 'tangerinedesigns.studio'];

function isEmailAllowed(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain);
}

module.exports = isEmailAllowed;
