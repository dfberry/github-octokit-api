// Converted from fetch_advocates_page.js to TypeScript
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const url = 'https://developer.microsoft.com/en-us/advocates/';

export interface Advocate {
  name: string;
  profile_url: string;
  twitterUrl?: string;
  twitter?: string;
  expertise?: string;
  bio?: string;
  imageUrl?: string;
  githubUrl?: string;
  github?: string;
  specialties?: string[]; // Add skills field to Advocate interface
}

async function fetchProfileDetails(profileUrl: string): Promise<Partial<Advocate>> {
  try {
    const response = await fetch(profileUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const bioSection = $('h2:contains("Bio")').next();
    const bio = bioSection.find('p').first().text().trim() || 
                bioSection.text().trim() || 
                $('.bio, .profile-bio, [itemprop="description"]').first().text().trim() || undefined;

    const imageUrl = $('img[alt*="Cloud Advocate"], img[src*="profiles/"], img.profile-image, img[alt*="photo"], img[alt*="avatar"]').first().attr('src') || undefined;
    const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ? 
      new URL(imageUrl, 'https://developer.microsoft.com').toString() : imageUrl;

    const githubUrl = $('a[href*="github.com"]').first().attr('href') || undefined;
    const githubUsername = githubUrl ? githubUrl.split('/').filter(Boolean).pop() : undefined;

    const skills = $('h2:contains("Skills")')
      .next('ul')
      .find('li')
      .toArray()
      .map(skillEl => $(skillEl).text().trim())
      .filter(skill => skill.length > 0) || undefined;

    return { bio, imageUrl: fullImageUrl, githubUrl, github: githubUsername, specialties: skills };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {};
  }
}

export async function fetchAdvocatesPage(): Promise<Advocate[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const advocates: Advocate[] = [];

    const allLinks = $('a').toArray();
    const advocateLinks = allLinks.filter(el => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      return href && 
             !href.startsWith('http') && 
             !href.startsWith('#') && 
             !href.startsWith('/') &&
             text.length > 2 &&
             text.includes(' ') &&
             !href.includes('twitter.com');
    });

    for (const el of advocateLinks) {
      const $el = $(el);
      const name = $el.text().trim();
      let profileUrl = $el.attr('href') || '';

      if (!name || !profileUrl || name.length < 2) continue;

      if (profileUrl && !profileUrl.startsWith('http')) {
        profileUrl = new URL(profileUrl, url).toString();
      }

      const nextElements = $el.nextAll().slice(0, 3);

      let twitterUrl: string | undefined;
      let twitter: string | undefined;
      nextElements.each((_i, nextEl) => {
        const href = $(nextEl).attr('href');
        if (href && href.includes('twitter.com')) {
          twitterUrl = href;
          const match = href.match(/twitter\.com\/([a-zA-Z0-9_]+)/);
          twitter = match ? match[1] : undefined;
          return false;
        }
        return true;
      });

      const profileDetails = await fetchProfileDetails(profileUrl);
      advocates.push({ 
        name, 
        profile_url: profileUrl, 
        twitterUrl, 
        twitter, 
        ...profileDetails 
      });

      console.log(`Added advocate: ${name}`);
    }

    return advocates;
  } catch (err: any) {
    console.error('Error fetching page:', err.message);
    return [];
  }
}
