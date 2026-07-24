const TRELLO_PROXY_BASE = '/trello-api/1';

function normalizeCredential(value) {
  return String(value ?? '').trim();
}

function requestUrl(path, apiKey, accessToken, parameters = {}) {
  const url = new URL(`${TRELLO_PROXY_BASE}${path}`, window.location.origin);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('token', accessToken);

  for (const [key, value] of Object.entries(parameters)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }

  return `${url.pathname}${url.search}`;
}

async function trelloRequest(path, credentials, parameters) {
  const apiKey = normalizeCredential(credentials?.apiKey);
  const accessToken = normalizeCredential(credentials?.accessToken);

  if (!apiKey || !accessToken) {
    throw new Error('Informe a API Key e o token de acesso do Trello.');
  }

  let response;
  try {
    response = await fetch(
      requestUrl(path, apiKey, accessToken, parameters),
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );
  } catch {
    throw new Error('Não foi possível acessar o Trello. Verifique sua conexão.');
  }

  if (response.status === 400 || response.status === 401) {
    throw new Error('A API Key ou o token do Trello é inválido ou expirou.');
  }

  if (response.status === 403) {
    throw new Error('O token não tem permissão para ler esses quadros.');
  }

  if (!response.ok) {
    throw new Error(`O Trello respondeu com o erro ${response.status}.`);
  }

  return response.json();
}

export function trelloAuthorizationUrl(apiKey) {
  const normalizedKey = normalizeCredential(apiKey);

  if (!normalizedKey) {
    throw new Error('Informe a API Key antes de gerar o token.');
  }

  const url = new URL('https://trello.com/1/authorize');
  url.searchParams.set('expiration', 'never');
  url.searchParams.set('scope', 'read');
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('name', 'Rics Time-blocking');
  url.searchParams.set('key', normalizedKey);
  return url.toString();
}

export async function fetchTrelloSetup(apiKey, accessToken) {
  const credentials = { apiKey, accessToken };
  const [member, boards] = await Promise.all([
    trelloRequest('/members/me', credentials, {
      fields: 'id,fullName,username'
    }),
    trelloRequest('/members/me/boards', credentials, {
      filter: 'open',
      fields: 'id,name,closed'
    })
  ]);

  if (!member?.id) {
    throw new Error('O Trello não retornou uma identificação de usuário válida.');
  }

  if (!Array.isArray(boards)) {
    throw new Error('O Trello retornou uma lista de quadros inválida.');
  }

  const boardsWithLists = await Promise.all(
    boards.map(async (board) => {
      const lists = await trelloRequest(
        `/boards/${encodeURIComponent(board.id)}/lists`,
        credentials,
        {
          filter: 'open',
          fields: 'id,name,closed'
        }
      );

      return {
        id: String(board.id),
        name: String(board.name || 'Quadro sem nome'),
        lists: Array.isArray(lists)
          ? lists.map((list) => ({
              id: String(list.id),
              name: String(list.name || 'Lista sem nome')
            }))
          : []
      };
    })
  );

  return {
    member: {
      id: String(member.id),
      name: String(member.fullName || member.username || 'Usuário do Trello'),
      username: String(member.username || '')
    },
    boards: boardsWithLists
  };
}

export async function fetchOpenTrelloCards(connection) {
  const boardIds = Array.isArray(connection?.boardIds)
    ? connection.boardIds.map(String)
    : [];
  const doneListIds = new Set(
    Array.isArray(connection?.doneListIds)
      ? connection.doneListIds.map(String)
      : []
  );
  const boardById = new Map(
    (Array.isArray(connection?.boards) ? connection.boards : []).map(
      (board) => [String(board.id), board]
    )
  );

  if (!boardIds.length) {
    throw new Error('Escolha ao menos um quadro do Trello.');
  }

  const cardPages = await Promise.all(
    boardIds.map((boardId) =>
      trelloRequest(
        `/boards/${encodeURIComponent(boardId)}/cards/open`,
        connection,
        {
          fields: 'id,name,url,shortUrl,idBoard,idList,closed'
        }
      )
    )
  );

  return cardPages.flatMap((cards, index) => {
    if (!Array.isArray(cards)) {
      throw new Error('O Trello retornou uma lista de cards inválida.');
    }

    const boardId = boardIds[index];
    const board = boardById.get(boardId);

    return cards
      .filter((card) => !doneListIds.has(String(card.idList)))
      .map((card) => ({
        title: String(card.name ?? ''),
        externalId: String(card.id ?? ''),
        externalKey: `trello:${boardId}:${card.id}`,
        sourceUrl:
          typeof card.url === 'string'
            ? card.url
            : typeof card.shortUrl === 'string'
              ? card.shortUrl
              : '',
        sourceBoardName: String(board?.name || 'Trello')
      }));
  });
}
