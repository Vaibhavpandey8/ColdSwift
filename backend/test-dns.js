const dns = require('dns').promises;

console.log("Testing DNS lookup speed...");
const startTime = Date.now();

dns.lookup('sourcefuse.com')
  .then(result => {
    console.log(`✅ DNS Lookup resolved in ${Date.now() - startTime}ms!`);
    console.log("Address:", result.address);
    process.exit();
  })
  .catch(error => {
    console.error(`❌ DNS Lookup failed in ${Date.now() - startTime}ms!`);
    console.error(error);
    process.exit();
  });
