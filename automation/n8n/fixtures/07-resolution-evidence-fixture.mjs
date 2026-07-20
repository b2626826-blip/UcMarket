import http from 'node:http';

const port = Number.parseInt(process.env.FIXTURE_PORT ?? '8080', 10);
const mode = process.env.FIXTURE_MODE ?? 'happy';
const candidateToken = process.env.FIXTURE_CANDIDATE_TOKEN;
const evidenceToken = process.env.FIXTURE_EVIDENCE_TOKEN;
const candidateCount = Number.parseInt(process.env.FIXTURE_CANDIDATE_COUNT ?? '52', 10);

if (!candidateToken || !evidenceToken || candidateToken === evidenceToken) {
  console.error('Fixture requires two distinct auth values supplied through environment variables.');
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1 || port > 65535
    || !Number.isInteger(candidateCount) || candidateCount < 1) {
  console.error('Fixture port and candidate count must be valid positive integers.');
  process.exit(1);
}

const evidenceByMarket = new Map();
const attemptsByMarket = new Map();
const candidatePageRequests = [];
let candidateAuthRejectedCount = 0;
let evidenceAuthRejectedCount = 0;
let hostnameTitleMatchCount = 0;
let publishedAtNullCount = 0;
const candidates = Array.from({ length: candidateCount }, (_, index) => {
  const serial = String(index + 1).padStart(12, '0');
  return {
    marketId: `00000000-0000-4000-8000-${serial}`,
    title: `Fixture candidate ${index + 1}`,
    sourceUrl: mode === 'invalid-source' && index === 0
      ? ''
      : `https://news.example.test/article/${index + 1}`,
    resolutionRule: 'Fixture resolution rule',
    closeAt: `2026-07-20T${String(index % 24).padStart(2, '0')}:00:00`,
  };
});

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function presentedToken(request) {
  const value = request.headers['x-n8n-service-token'];
  return Array.isArray(value) ? value[0] : value;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 65_536) {
        reject(new Error('request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    request.on('error', reject);
  });
}

function candidatePage(requestUrl) {
  const remaining = candidates.filter((candidate) => !evidenceByMarket.has(candidate.marketId));
  const requestedPage = Number.parseInt(requestUrl.searchParams.get('page') ?? '0', 10);
  const requestedSize = Number.parseInt(requestUrl.searchParams.get('size') ?? '20', 10);
  const page = Number.isInteger(requestedPage) ? Math.max(requestedPage, 0) : 0;
  const size = Number.isInteger(requestedSize)
    ? Math.min(Math.max(requestedSize, 1), 50)
    : 20;
  const totalElements = remaining.length;
  const totalPages = Math.ceil(totalElements / size);
  const content = remaining.slice(page * size, (page + 1) * size);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page + 1 >= totalPages,
    hasNext: page + 1 < totalPages,
  };
}

async function saveEvidence(request, response, marketId) {
  if (presentedToken(request) !== evidenceToken) {
    evidenceAuthRejectedCount += 1;
    sendJson(response, 403, { status: 'FORBIDDEN' });
    return;
  }

  const attemptCount = (attemptsByMarket.get(marketId) ?? 0) + 1;
  attemptsByMarket.set(marketId, attemptCount);

  if (mode === 'retry' && marketId === candidates[0].marketId && attemptCount < 3) {
    sendJson(response, 503, { status: 'TEMPORARILY_UNAVAILABLE' });
    return;
  }
  if (mode === 'permanent-error' && marketId === candidates[0].marketId) {
    sendJson(response, 400, { status: 'INVALID_FIXTURE_EVIDENCE' });
    return;
  }

  let body;
  try {
    body = await readJson(request);
  } catch {
    sendJson(response, 400, { status: 'INVALID_JSON' });
    return;
  }

  let expectedHostname = null;
  try {
    const parsed = new URL(body.sourceUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      expectedHostname = parsed.hostname;
    }
  } catch {
    // Invalid sources are expected in invalid-source mode.
  }
  if (expectedHostname !== null && body.sourceTitle === expectedHostname) {
    hostnameTitleMatchCount += 1;
  }
  if (body.publishedAt === null) {
    publishedAtNullCount += 1;
  }

  const validUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/.test(body.sourceUrl);
  const validTitle = typeof body.sourceTitle === 'string'
    && body.sourceTitle.trim().length > 0
    && body.sourceTitle.length <= 500;
  if (!validUrl || !validTitle || body.publishedAt !== null) {
    sendJson(response, 400, { status: 'INVALID_FIXTURE_EVIDENCE' });
    return;
  }

  const existing = evidenceByMarket.get(marketId);
  if (existing) {
    sendJson(response, 200, existing);
    return;
  }

  const saved = {
    id: `10000000-0000-4000-8000-${String(evidenceByMarket.size + 1).padStart(12, '0')}`,
    marketId,
    sourceUrl: body.sourceUrl,
    sourceTitle: body.sourceTitle,
    publishedAt: null,
    fetchedAt: '2026-07-20T00:00:00Z',
    createdAt: '2026-07-20T00:00:00Z',
  };
  evidenceByMarket.set(marketId, saved);
  sendJson(response, 200, saved);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET'
      && requestUrl.pathname === '/api/internal/current-affairs/resolution-evidence-candidates') {
    if (presentedToken(request) !== candidateToken) {
      candidateAuthRejectedCount += 1;
      sendJson(response, 403, { status: 'FORBIDDEN' });
      return;
    }
    candidatePageRequests.push(
      Number.parseInt(requestUrl.searchParams.get('page') ?? '0', 10),
    );
    sendJson(response, 200, candidatePage(requestUrl));
    return;
  }

  const evidenceMatch = requestUrl.pathname.match(
    /^\/api\/internal\/current-affairs\/markets\/([0-9a-f-]+)\/resolution-evidence$/,
  );
  if (request.method === 'POST' && evidenceMatch) {
    await saveEvidence(request, response, evidenceMatch[1]);
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/fixture/stats') {
    sendJson(response, 200, {
      mode,
      candidateCount: candidates.length,
      evidenceCount: evidenceByMarket.size,
      attemptCounts: Object.fromEntries(attemptsByMarket),
      candidatePageRequests,
      candidateAuthRejectedCount,
      evidenceAuthRejectedCount,
      hostnameTitleMatchCount,
      publishedAtNullCount,
    });
    return;
  }

  sendJson(response, 404, { status: 'NOT_FOUND' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`07 fixture listening on port ${port}; mode=${mode}; candidates=${candidateCount}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
