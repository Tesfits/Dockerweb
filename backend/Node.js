const allowedDomains = ['fortigrid.com', 'fortigrid.in', 'tangerinedesigns.studio'];

function isValidEmail(email) {
  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
}
