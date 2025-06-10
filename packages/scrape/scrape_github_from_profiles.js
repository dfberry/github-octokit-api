// Script to scrape GitHub usernames directly from advocate profile pages
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load the advocates data
const advocatesPath = path.join(__dirname, '../../data/advocates.json');
const advocates = JSON.parse(fs.readFileSync(advocatesPath, 'utf-8'));

// Function to fetch a webpage with better error handling and user-agent
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    // Set up request options with headers to mimic a browser
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    };
    
    console.log(`Fetching URL: ${url}`);
    
    const req = https.get(url, options, (res) => {
      console.log(`Response status code: ${res.statusCode}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Following redirect to ${res.headers.location}`);
        return fetchPage(res.headers.location)
          .then(resolve)
          .catch(reject);
      }
      
      // Handle error status codes
      if (res.statusCode !== 200) {
        return reject(new Error(`Server responded with status code ${res.statusCode}`));
      }
      
      // Set encoding
      res.setEncoding('utf8');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Successfully fetched ${data.length} bytes from ${url}`);
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      console.error(`Error fetching ${url}:`, err.message);
      reject(err);
    });
    
    // Set a timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after 30 seconds`));
    });
    
    req.end();
  });
}

// Function to extract GitHub username from advocate profile page
async function extractGithubFromProfile(advocate) {
  try {
    console.log(`Fetching profile for ${advocate.name}: ${advocate.profile_url}`);
    const pageContent = await fetchPage(advocate.profile_url);
    
    // First, let's try to find any mentions of github in the content
    console.log(`Looking for GitHub mentions in the page for ${advocate.name}`);
    
    // Extract all potential GitHub usernames by looking at all patterns together
    let potentialUsernames = [];
    
    // Pattern 1: <a> links with href to github.com/username
    // This covers standard HTML links to GitHub profiles
    const hrefPattern = /href=["']https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9-]+)(?:\/)?["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefPattern.exec(pageContent)) !== null) {
      potentialUsernames.push({
        username: hrefMatch[1],
        source: 'href link',
        confidence: 'high'
      });
    }
    
    // Pattern 2: General github.com/username anywhere in the content
    const githubPattern = /github\.com\/([a-zA-Z0-9-]+)(?:\/|\s|"|'|$)/gi;
    let githubMatch;
    while ((githubMatch = githubPattern.exec(pageContent)) !== null) {
      potentialUsernames.push({
        username: githubMatch[1],
        source: 'general mention',
        confidence: 'medium'
      });
    }
    
    // Pattern 3: JSON data often embedded in modern webpages
    const jsonPatterns = [
      /"github"\s*:\s*"([a-zA-Z0-9-]+)"/gi,
      /"githubUsername"\s*:\s*"([a-zA-Z0-9-]+)"/gi,
      /"githubUrl"\s*:\s*"[^"]*\/([a-zA-Z0-9-]+)"/gi
    ];
    
    for (const pattern of jsonPatterns) {
      let jsonMatch;
      while ((jsonMatch = pattern.exec(pageContent)) !== null) {
        potentialUsernames.push({
          username: jsonMatch[1],
          source: 'JSON data',
          confidence: 'high'
        });
      }
    }
    
    // Pattern 4: Social media links section
    const socialPattern = /(?:social|connect|links|follow)[\s\S]{1,200}github\.com\/([a-zA-Z0-9-]+)/gi;
    let socialMatch;
    while ((socialMatch = socialPattern.exec(pageContent)) !== null) {
      potentialUsernames.push({
        username: socialMatch[1],
        source: 'social section',
        confidence: 'high'
      });
    }
    
    // Pattern 5: Look for GitHub icon with nearby username (Font Awesome or similar)
    const iconPattern = /(?:fa-github|github-icon|icon-github)[\s\S]{1,100}>([\w-]+)</gi;
    let iconMatch;
    while ((iconMatch = iconPattern.exec(pageContent)) !== null) {
      potentialUsernames.push({
        username: iconMatch[1],
        source: 'icon label',
        confidence: 'medium'
      });
    }
    
    console.log(`Found ${potentialUsernames.length} potential GitHub usernames:`);
    potentialUsernames.forEach((item, i) => {
      console.log(`${i+1}. ${item.username} (from ${item.source}, ${item.confidence} confidence)`);
    });
    
    // Filter out common non-username paths
    const invalidUsernames = ['orgs', 'site', 'about', 'contact', 'features', 'team', 
                              'enterprise', 'explore', 'topics', 'marketplace', 'sponsors',
                              'collections', 'events', 'github', 'pricing', 'customer-stories'];
    
    potentialUsernames = potentialUsernames.filter(item => 
      !invalidUsernames.includes(item.username.toLowerCase())
    );
    
    console.log(`After filtering invalid names: ${potentialUsernames.length} potential usernames remain`);
    
    // If we have potential usernames, sort by confidence and return the best one
    if (potentialUsernames.length > 0) {
      // Sort by confidence (high > medium > low)
      const confidenceScore = {
        'high': 3,
        'medium': 2,
        'low': 1
      };
      
      potentialUsernames.sort((a, b) => {
        return confidenceScore[b.confidence] - confidenceScore[a.confidence];
      });
      
      const bestMatch = potentialUsernames[0];
      console.log(`Best GitHub username match for ${advocate.name}: ${bestMatch.username} (${bestMatch.confidence} confidence)`);
      return bestMatch.username;
    }
    
    console.log(`No GitHub username found for ${advocate.name}`);
    return null;
  } catch (error) {
    console.error(`Error fetching profile for ${advocate.name}:`, error.message);
    return null;
  }
}

// Function to validate if a GitHub username exists
async function validateGitHubUsername(username) {
  try {
    console.log(`Validating GitHub username: ${username}`);
    
    // Fetch the GitHub user page
    const url = `https://github.com/${username}`;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    // Use a simplified request just for validation
    return new Promise((resolve, reject) => {
      const req = https.get(url, options, (res) => {
        console.log(`GitHub validation status code for ${username}: ${res.statusCode}`);
        
        // 200 status code means the user exists
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
        
        // Consume response data to free up memory
        res.resume();
      });
      
      req.on('error', (err) => {
        console.error(`Error validating GitHub username ${username}:`, err.message);
        resolve(false);
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        console.log(`Validation request for ${username} timed out`);
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    console.error(`Error in validateGitHubUsername:`, error.message);
    return false;
  }
}

// Function to test a single advocate profile URL
async function testSingleProfile(url) {
  try {
    console.log(`Testing extraction from URL: ${url}`);
    
    // Create a mock advocate object
    const advocate = {
      name: "Test Advocate",
      profile_url: url
    };
    
    console.log('Fetching profile page...');
    const pageContent = await fetchPage(url);
    
    console.log('Page content length:', pageContent.length);
    
    // Print a small sample of the content for debugging
    const sample = pageContent.substring(0, 500) + '...';
    console.log('Sample of page content:');
    console.log(sample);
    
    // Debug: search for GitHub-related strings
    console.log('Searching for GitHub mentions:');
    if (pageContent.includes('github.com')) {
      console.log('Found "github.com" in the page');
      
      // Show context around github.com
      const index = pageContent.indexOf('github.com');
      const start = Math.max(0, index - 100);
      const end = Math.min(pageContent.length, index + 100);
      console.log('Context:', pageContent.substring(start, end));
    } else {
      console.log('No "github.com" found in the page');
    }
    
    const username = await extractGithubFromProfile(advocate);
    
    if (username) {
      console.log(`✅ Found GitHub username: ${username}`);
      
      // Validate the username
      const isValid = await validateGitHubUsername(username);
      if (isValid) {
        console.log(`✓ Validated: GitHub username ${username} exists!`);
      } else {
        console.log(`✗ Validation failed: GitHub username ${username} may not exist`);
      }
    } else {
      console.log(`❌ Failed to find GitHub username at URL: ${url}`);
    }
  } catch (error) {
    console.error(`Error testing URL ${url}:`, error.stack);
  }
}

// Process all advocates
async function processAllAdvocates() {
  console.log(`Processing ${advocates.length} advocates...`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let retries = 0;
  const maxRetries = 3;
  
  // Add a small delay between requests to be polite to the server
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Save progress function
  const saveProgress = () => {
    fs.writeFileSync(advocatesPath, JSON.stringify(advocates, null, 2));
    console.log(`Progress saved. Current stats:`);
    console.log(`- Updated: ${updated} advocates`);
    console.log(`- Skipped: ${skipped} advocates`);
    console.log(`- Failed: ${failed} advocates`);
    console.log(`- Retries: ${retries}`);
  };
  
  // Process in batches to avoid overwhelming the server
  const batchSize = 10;
  
  for (let i = 0; i < advocates.length; i++) {
    const advocate = advocates[i];
    const advocateNum = i + 1;
    
    // Skip if we already have GitHub info and it has high confidence
    if (advocate.github && advocate.github_confidence === 'high') {
      console.log(`[${advocateNum}/${advocates.length}] Skipping ${advocate.name} - already has GitHub username with high confidence`);
      skipped++;
      continue;
    }
    
    // If we have GitHub info but not high confidence, log it
    if (advocate.github) {
      console.log(`[${advocateNum}/${advocates.length}] ${advocate.name} has GitHub username ${advocate.github} with ${advocate.github_confidence || 'unknown'} confidence. Trying to verify...`);
    }
    
    let attemptCount = 0;
    let success = false;
    
    while (attemptCount < maxRetries && !success) {
      if (attemptCount > 0) {
        console.log(`Retry #${attemptCount} for ${advocate.name}`);
        retries++;
        await delay(5000); // Longer delay for retries
      }
      
      try {
        // Extract GitHub username from profile
        const username = await extractGithubFromProfile(advocate);
        
        if (username) {
          // Validate the username
          const isValid = await validateGitHubUsername(username);
          
          if (isValid) {
            // Update the advocate object with validated username
            advocate.github = username;
            advocate.github_confidence = 'high'; // Direct from profile page and validated is high confidence
            advocate.github_validated = true;
            updated++;
            success = true;
            
            console.log(`✅ [${advocateNum}/${advocates.length}] Successfully updated ${advocate.name} with validated GitHub username: ${username}`);
          } else {
            console.log(`⚠️ [${advocateNum}/${advocates.length}] Found GitHub username ${username} for ${advocate.name}, but validation failed`);
            
            // Still store the username, but with lower confidence
            if (!advocate.github) {
              advocate.github = username;
              advocate.github_confidence = 'medium';
              advocate.github_validated = false;
              updated++;
            }
            
            if (attemptCount === maxRetries - 1) {
              console.log(`Using unvalidated username as best effort: ${username}`);
              success = true;
            }
          }
        } else {
          if (advocate.github) {
            // Try to validate existing GitHub info
            const existingIsValid = await validateGitHubUsername(advocate.github);
            
            if (existingIsValid) {
              advocate.github_validated = true;
              console.log(`✓ [${advocateNum}/${advocates.length}] Validated existing GitHub info for ${advocate.name}: ${advocate.github}`);
            } else {
              advocate.github_validated = false;
              console.log(`✗ [${advocateNum}/${advocates.length}] Existing GitHub username for ${advocate.name} failed validation: ${advocate.github}`);
            }
            
            // Keep existing GitHub info regardless of validation
            console.log(`ℹ️ [${advocateNum}/${advocates.length}] Keeping existing GitHub info for ${advocate.name}: ${advocate.github} (${advocate.github_confidence || 'unknown'} confidence)`);
            success = true; // Consider this a success to avoid retries
          } else {
            console.log(`❌ [${advocateNum}/${advocates.length}] Failed to find GitHub username for ${advocate.name}`);
            
            if (attemptCount === maxRetries - 1) {
              failed++;
            }
          }
        }
      } catch (error) {
        console.error(`⚠️ [${advocateNum}/${advocates.length}] Error processing ${advocate.name}:`, error.message);
        
        // If we've reached max retries, count as failed
        if (attemptCount === maxRetries - 1) {
          failed++;
        }
      }
      
      attemptCount++;
    }
    
    // Wait between requests
    await delay(2000);
    
    // Save progress at regular intervals
    if (advocateNum % batchSize === 0 || advocateNum === advocates.length) {
      saveProgress();
    }
  }
  
  // Save the final results
  fs.writeFileSync(advocatesPath, JSON.stringify(advocates, null, 2));
  
  console.log('\nDone!');
  console.log(`- Updated: ${updated} advocates`);
  console.log(`- Skipped (already had GitHub): ${skipped} advocates`);
  console.log(`- Failed to find GitHub: ${failed} advocates`);
}

// Check if a test URL is provided as an argument
const testUrl = process.argv[2];

if (testUrl && testUrl.startsWith('http')) {
  // Run in test mode with the provided URL
  testSingleProfile(testUrl);
} else {
  // Run the normal process for all advocates
  processAllAdvocates().catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
  });
}
