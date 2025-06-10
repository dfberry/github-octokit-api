// Script to add GitHub usernames to the advocates JSON data
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load the advocates data
const advocatesPath = path.join(__dirname, '../../data/advocates.json');
const advocates = JSON.parse(fs.readFileSync(advocatesPath, 'utf-8'));

// Set up GitHub API options
const githubToken = process.env.GITHUB_TOKEN; // Make sure to set this env variable
if (!githubToken) {
  console.warn('GITHUB_TOKEN environment variable not set. Using unauthenticated API with lower rate limits.');
}

// Function to search GitHub for a user with improved matching
async function findGitHubUser(name, twitter) {
  try {
    // Add basic information about the lookup
    console.log(`---------------------------------`);
    console.log(`Name: ${name}`);
    console.log(`Twitter: ${twitter || 'Not available'}`);
    
    // Strategy 1: Try exact name match
    console.log(`Strategy 1: Searching by name: "${name}"`);
    const nameData = await searchGitHub(name);
    let users = nameData.items || [];
    console.log(`Found ${users.length} results`);
    
    if (users.length > 0) {
      console.log(`Top 3 results:`);
      for (let i = 0; i < Math.min(users.length, 3); i++) {
        console.log(`  ${i+1}. ${users[i].login} (${users[i].html_url})`);
      }
    }
    
    // Strategy 2: If Twitter handle available, try to find users whose bio contains the Twitter handle
    if (twitter && users.length > 0) {
      console.log(`Strategy 2: Looking for Twitter handle @${twitter} in user profiles...`);
      
      // Check each user's bio for Twitter handle (first 5 to avoid too many API calls)
      for (let i = 0; i < Math.min(users.length, 5); i++) {
        try {
          const userDetails = await getUserDetails(users[i].login);
          const bio = (userDetails.bio || '').toLowerCase();
          
          if (bio.includes(`@${twitter.toLowerCase()}`) || 
              bio.includes(`twitter.com/${twitter.toLowerCase()}`)) {
            console.log(`✅ Found user via Twitter handle in bio: ${users[i].login}`);
            return { username: users[i].login, confidence: 'high' };
          }
        } catch (err) {
          console.log(`Error getting details for ${users[i].login}: ${err.message}`);
        }
      }
    }
    
    // Strategy 3: Look for Microsoft employees in results (high confidence match)
    if (users.length > 0) {
      console.log(`Looking for Microsoft employees among ${users.length} results...`);
      
      // Check the first 5 users (to avoid too many API calls)
      for (let i = 0; i < Math.min(users.length, 5); i++) {
        try {
          const userDetails = await getUserDetails(users[i].login);
          const company = (userDetails.company || '').toLowerCase();
          const bio = (userDetails.bio || '').toLowerCase();
          
          if (company.includes('microsoft') || company.includes('msft') || 
              bio.includes('microsoft') || bio.includes('msft')) {
            console.log(`Found Microsoft employee: ${users[i].login}`);
            return { username: users[i].login, confidence: 'high' };
          }
        } catch (err) {
          continue;
        }
      }
    }
    
    // Strategy 4: If only one result, take it (medium confidence)
    if (users.length === 1) {
      console.log(`Found single user result: ${users[0].login}`);
      return { username: users[0].login, confidence: 'medium' };
    }
    
    // Strategy 5: Try direct Twitter handle match
    if (twitter) {
      console.log(`Searching for user with Twitter handle as username: ${twitter}`);
      const twitterData = await searchGitHub(twitter);
      const twitterUsers = twitterData.items || [];
      
      // Check for exact match between Twitter handle and GitHub username
      const exactMatch = twitterUsers.find(user => 
        user.login.toLowerCase() === twitter.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`Found exact Twitter handle match: ${exactMatch.login}`);
        return { username: exactMatch.login, confidence: 'high' };
      } else if (twitterUsers.length > 0) {
        console.log(`Found Twitter search result: ${twitterUsers[0].login}`);
        return { username: twitterUsers[0].login, confidence: 'medium' };
      }
      
      // Strategy 6: Try first and last name combinations
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        
        console.log(`Trying name combination search: ${firstName} ${lastName}`);
        const nameData = await searchGitHub(`${firstName} ${lastName}`);
        const nameUsers = nameData.items || [];
        
        if (nameUsers.length > 0) {
          // Try to find Microsoft employees again
          for (let i = 0; i < Math.min(nameUsers.length, 3); i++) {
            try {
              const userDetails = await getUserDetails(nameUsers[i].login);
              const company = (userDetails.company || '').toLowerCase();
              const bio = (userDetails.bio || '').toLowerCase();
              
              if (company.includes('microsoft') || company.includes('msft') || 
                  bio.includes('microsoft') || bio.includes('msft')) {
                console.log(`Found Microsoft employee via name parts: ${nameUsers[i].login}`);
                return { username: nameUsers[i].login, confidence: 'medium' };
              }
            } catch (err) {
              continue;
            }
          }
          
          // Return first result if no Microsoft employee found
          console.log(`Found name parts match: ${nameUsers[0].login}`);
          return { username: nameUsers[0].login, confidence: 'low' };
        }
      }
    }
    
    // If we still have results from the first search but none matched our criteria
    if (users.length > 0) {
      console.log(`Using first result as fallback: ${users[0].login}`);
      return { username: users[0].login, confidence: 'low' };
    }
    
    // No matches found
    return null;
  } catch (error) {
    console.error(`Error searching for ${name}:`, error.message);
    return null;
  }
}

// Function to get detailed user information
function getUserDetails(username) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'GitHub-Advocate-Finder',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const options = {
      hostname: 'api.github.com',
      path: `/users/${encodeURIComponent(username)}`,
      headers
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API responded with status ${res.statusCode}`));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

// Function to call GitHub API
function searchGitHub(query) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'GitHub-Advocate-Finder',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Add authorization if token is available
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const options = {
      hostname: 'api.github.com',
      path: `/search/users?q=${encodeURIComponent(query)}`,
      headers
    };

    const req = https.get(options, (res) => {
      // Check for rate limit
      if (res.statusCode === 403) {
        if (res.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = new Date(parseInt(res.headers['x-ratelimit-reset']) * 1000);
          const resetTimestamp = parseInt(res.headers['x-ratelimit-reset']) * 1000;
          const waitTime = resetTimestamp - Date.now() + 1000; // Add a buffer second
          console.log(`Rate limit exceeded. Resets at ${resetTime.toLocaleString()} (waiting ${Math.round(waitTime/1000)} seconds)`);
          return reject(new Error(`rate limit:${waitTime}`));
        }
        console.log('GitHub API request failed with 403 status code.');
        return reject(new Error('GitHub API request forbidden'));
      }
      
      // Check for other errors
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API responded with status ${res.statusCode}`));
      }

      // Log rate limit info
      if (res.headers['x-ratelimit-remaining']) {
        console.log(`GitHub API rate limit: ${res.headers['x-ratelimit-remaining']}/${res.headers['x-ratelimit-limit']} remaining`);
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Process each advocate and find their GitHub username
async function processAdvocates() {
  console.log(`Processing ${advocates.length} advocates...`);
  
  // Add a small delay between requests to avoid GitHub API rate limits
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Track statistics
  let updated = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let skipped = 0;
  let remaining = 0;
  
  // Count how many advocates need processing
  const needProcessing = advocates.filter(a => !a.github).length;
  console.log(`${needProcessing} advocates need GitHub accounts.`);
  
  // Save progress periodically in case of errors or rate limits
  const saveProgress = () => {
    fs.writeFileSync(advocatesPath, JSON.stringify(advocates, null, 2));
    console.log(`Progress saved. Statistics so far:`);
    console.log(`- High confidence matches: ${highConfidence}`);
    console.log(`- Medium confidence matches: ${mediumConfidence}`);
    console.log(`- Low confidence matches: ${lowConfidence}`);
    console.log(`- Total updated: ${updated}`);
    console.log(`- Skipped (already had GitHub): ${skipped}`);
    console.log(`- Remaining to process: ${remaining}`);
  };
  
  for (let i = 0; i < advocates.length; i++) {
    const advocate = advocates[i];
    
    // Skip if we already have GitHub info
    if (advocate.github) {
      skipped++;
      continue;
    }
    
    remaining = needProcessing - updated;
    console.log(`\n[${updated+1}/${needProcessing}] Looking up ${advocate.name}... (${remaining} remaining)`);
    
    try {
      // Search for GitHub username
      const result = await findGitHubUser(advocate.name, advocate.twitter);
      
      if (result) {
        if (typeof result === 'string') {
          // For backward compatibility with older function versions
          advocate.github = result;
          advocate.github_confidence = 'unknown'; 
          console.log(` - Found GitHub: ${result}`);
          updated++;
        } else {
          // New version returns object with username and confidence
          advocate.github = result.username;
          advocate.github_confidence = result.confidence;
          
          console.log(` - Found GitHub: ${result.username} (${result.confidence} confidence)`);
          
          // Update confidence counters
          if (result.confidence === 'high') highConfidence++;
          else if (result.confidence === 'medium') mediumConfidence++;
          else lowConfidence++;
          
          updated++;
        }
      } else {
        console.log(` - No GitHub account found`);
      }
    } catch (error) {
      console.error(` - Error processing advocate: ${error.message}`);
      
      // If we encounter a rate limit error, wait until the limit resets
      if (error.message.includes('rate limit:')) {
        // Extract the wait time from the error message
        const waitTime = parseInt(error.message.split(':')[1]);
        console.log(`Rate limit reached. Saving progress and waiting ${Math.round(waitTime/1000)} seconds...`);
        saveProgress();
        
        // Wait for the rate limit to reset
        await delay(waitTime);
        console.log('Rate limit reset time reached. Continuing processing...');
        
        // Retry this advocate
        i--; // Decrement i to retry the current advocate on the next loop
        continue;
      }
    }
    
    // Wait before next request to avoid rate limits
    await delay(2000);
    
    // Save progress every 10 advocates
    if ((i + 1) % 10 === 0) {
      saveProgress();
    }
  }
  
  // Write the final updated advocates back to the file
  fs.writeFileSync(advocatesPath, JSON.stringify(advocates, null, 2));
  
  // Create a summary report with all advocates and their GitHub accounts
  const totalAdvocates = advocates.length;
  const withGitHub = advocates.filter(a => a.github).length;
  const withoutGitHub = totalAdvocates - withGitHub;
  
  // Create report content
  const reportLines = [
    '# Microsoft Advocates GitHub Accounts Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Total Advocates: ${totalAdvocates}`,
    `- With GitHub accounts: ${withGitHub} (${Math.round(withGitHub / totalAdvocates * 100)}%)`,
    `- Without GitHub accounts: ${withoutGitHub} (${Math.round(withoutGitHub / totalAdvocates * 100)}%)`,
    '',
    '## Confidence Levels',
    '',
    `- High confidence matches: ${highConfidence}`,
    `- Medium confidence matches: ${mediumConfidence}`,
    `- Low confidence matches: ${lowConfidence}`,
    `- Unknown confidence (processed earlier): ${withGitHub - highConfidence - mediumConfidence - lowConfidence}`,
    '',
    '## Advocates with GitHub Accounts',
    '',
    '| Name | Twitter | GitHub | Confidence |',
    '|------|---------|--------|------------|',
  ];
  
  // Add advocate data rows
  advocates
    .filter(a => a.github)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(advocate => {
      const twitter = advocate.twitter ? `[@${advocate.twitter}](https://twitter.com/${advocate.twitter})` : 'N/A';
      const github = `[${advocate.github}](https://github.com/${advocate.github})`;
      const confidence = advocate.github_confidence || 'N/A';
      
      reportLines.push(`| ${advocate.name} | ${twitter} | ${github} | ${confidence} |`);
    });
  
  // Add section for advocates without GitHub accounts
  reportLines.push(
    '',
    '## Advocates without GitHub Accounts',
    '',
    '| Name | Twitter |',
    '|------|---------|',
  );
  
  advocates
    .filter(a => !a.github)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(advocate => {
      const twitter = advocate.twitter ? `[@${advocate.twitter}](https://twitter.com/${advocate.twitter})` : 'N/A';
      reportLines.push(`| ${advocate.name} | ${twitter} |`);
    });
  
  // Write report to file
  const reportPath = path.join(__dirname, '../../data/github-accounts-report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log(`Report generated at: ${reportPath}`);
  
  // Print final statistics
  console.log(`\nDone! Updated GitHub information for ${updated} advocates.`);
  console.log(`- High confidence matches: ${highConfidence}`);
  console.log(`- Medium confidence matches: ${mediumConfidence}`);
  console.log(`- Low confidence matches: ${lowConfidence}`);
  console.log(`- Total with GitHub accounts: ${withGitHub} out of ${totalAdvocates} (${Math.round(withGitHub / totalAdvocates * 100)}%)`);
  console.log(`- Total skipped (already had GitHub): ${skipped}`);
}

// Run the process
processAdvocates().catch(err => {
  console.error('Error processing advocates:', err);
  process.exit(1);
});
