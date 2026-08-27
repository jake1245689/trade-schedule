const GENERATE_TIMEOUT_MS = 120000;

/**
 * Calls Pollinations.ai's free "kontext" model to edit an existing image
 * using a text prompt. No API key required. See:
 * https://github.com/pollinations/pollinations/blob/master/APIDOCS.md
 *
 * @param {string} imageUrl - Publicly reachable URL of the source image.
 * @param {string} prompt - Editing instructions, e.g. "replace the lawn with river stone paving".
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function editImage(imageUrl, prompt) {
  const params = new URLSearchParams({
    model: 'kontext',
    image: imageUrl,
    width: '1024',
    height: '1024',
    nologo: 'true',
    referrer: 'ai-landscape-render',
  });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The free image service took too long to respond. Please try again in a minute.');
    }
    throw new Error('Could not reach the free image service. Please try again shortly.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited by the free image service (anonymous use allows about 1 request every 15 seconds). Please wait a bit and try again.');
    }
    throw new Error(`Image service returned an error (HTTP ${response.status}). Please try again, or simplify your prompt.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!contentType.startsWith('image/')) {
    throw new Error('The image service did not return an image. Please try again with a different prompt.');
  }

  return { buffer, contentType };
}

module.exports = { editImage };
