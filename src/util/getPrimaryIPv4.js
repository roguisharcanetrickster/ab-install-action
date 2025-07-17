// Utility to get the primary IPv4 address for Docker Swarm advertise-addr
function getPrimaryIPv4() {
  // For testing, default to localhost
  return '127.0.0.1';
}

module.exports = getPrimaryIPv4; 