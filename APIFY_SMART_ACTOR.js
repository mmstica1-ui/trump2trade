import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

// Function to send directly to our webhook
async function sendToWebhook(data) {
    try {
        const response = await fetch('https://web-production-918d1.up.railway.app/webhook/genspark?secret=moshe454', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.text();
        console.log('Webhook response:', result);
        return response.ok;
    } catch (error) {
        console.error('Webhook failed:', error);
        return false;
    }
}

const crawler = new CheerioCrawler({
    requestHandler: async ({ request, $ }) => {
        console.log(`Processing ${request.url}...`);
        
        let postText = '';
        let postId = '';
        
        // Try to find the latest post content
        const statusMatch = $('script').text().match(/"content":"([^"]{20,500})"/);
        if (statusMatch) {
            postText = statusMatch[1].replace(/\\n/g, ' ').replace(/\\u[0-9a-f]{4}/g, ' ');
        }
        
        // Fallback - meta tags  
        if (!postText) {
            postText = $('meta[property="og:description"]').attr('content') || '';
        }
        
        // Find post ID - this is crucial for deduplication!
        const idMatch = request.url.match(/post[s]?\\/([0-9]+)/) || $('script').text().match(/"statusId":"([0-9]+)"/);
        if (idMatch) {
            postId = idMatch[1];
        }
        
        // If no meaningful content found, skip
        if (!postText || postText.length < 10) {
            console.log('No meaningful content found, skipping...');
            return;
        }
        
        const data = {
            text: postText,
            url: request.url,
            id: postId || Date.now().toString(),
            timestamp: new Date().toISOString()
        };
        
        console.log('Found post:', data);
        
        // Check if this post was already processed
        const existingData = await Actor.getValue('LAST_POST_ID');
        if (existingData && existingData === postId) {
            console.log(`Post ${postId} already processed, skipping webhook...`);
            return; // DON'T send webhook for same post!
        }
        
        // Save to Apify dataset
        await Actor.pushData(data);
        
        // Store the current post ID to avoid duplicates
        await Actor.setValue('LAST_POST_ID', postId);
        
        // Send to webhook ONLY if it's a new post
        console.log(`NEW POST DETECTED: ${postId}, sending webhook...`);
        const webhookSuccess = await sendToWebhook(data);
        console.log('Webhook success:', webhookSuccess);
    },
});

await crawler.run(['https://truthsocial.com/@realDonaldTrump']);
await Actor.exit();