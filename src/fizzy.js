const FIZZY_PROXY_BASE = '/fizzy-api';

function proxyUrl(value) {
  const url = new URL(value, 'https://app.fizzy.do');
  return `${FIZZY_PROXY_BASE}${url.pathname}${url.search}`;
}

function nextPageUrl(linkHeader) {
  if (!linkHeader) return null;

  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (match) return proxyUrl(match[1]);
  }

  return null;
}

async function fizzyRequest(path, accessToken) {
  const requestUrl = String(path).startsWith(FIZZY_PROXY_BASE) ? path : proxyUrl(path);
  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    throw appError('error.fizzy.invalidToken');
  }

  if (response.status === 403) {
    throw appError('error.fizzy.forbidden');
  }

  if (!response.ok) {
    throw appError('error.fizzy.response', { status: response.status });
  }

  return response;
}

export async function fetchFizzyAccounts(accessToken) {
  const token = String(accessToken ?? '').trim();

  if (!token) {
    throw appError('error.fizzy.tokenRequired');
  }

  const response = await fizzyRequest('/my/identity', token);
  const data = await response.json();

  if (!Array.isArray(data?.accounts) || !data.accounts.length) {
    throw appError('error.fizzy.noAccounts');
  }

  return data.accounts.map((account) => ({
    id: String(account.id),
    name: String(account.name || 'Conta sem nome'),
    slug: String(account.slug || '').replace(/^\/+|\/+$/g, '')
  }));
}

export async function fetchOpenFizzyCards({ accessToken, accountSlug, accountId }) {
  const token = String(accessToken ?? '').trim();
  const slug = String(accountSlug ?? '').replace(/^\/+|\/+$/g, '');

  if (!token || !slug || !accountId) {
    throw appError('error.fizzy.incomplete');
  }

  let url = proxyUrl(
    `/${encodeURIComponent(slug)}/cards?indexed_by=all&sorted_by=latest`
  );
  const cards = [];

  while (url) {
    const response = await fizzyRequest(url, token);
    const page = await response.json();

    if (!Array.isArray(page)) {
      throw appError('error.fizzy.invalidTasks');
    }

    cards.push(...page);
    url = nextPageUrl(response.headers.get('Link'));
  }

  return cards.map((card) => ({
    title: String(card.title ?? ''),
    externalId: String(card.id ?? ''),
    externalKey: `fizzy:${accountId}:${card.id}`,
    sourceUrl: typeof card.url === 'string' ? card.url : '',
    sourceBoardName: typeof card.board?.name === 'string' ? card.board.name : ''
  }));
}
import { appError } from './app-error.js';
