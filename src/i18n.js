export const SUPPORTED_LOCALES = ['pt-BR', 'en'];

const MESSAGES = {
  'pt-BR': {
    'app.description': 'Planeje suas tarefas em blocos de tempo, com dados salvos localmente.',
    'task.count': ({ count }) => `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`,
    'project.taskCount': ({ count }) => `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`,
    'history.deleteCount': ({ count }) =>
      `${formatNumber(count)} ${count === 1 ? 'bloco excluído' : 'blocos excluídos'}.`,
    'history.previewCount': ({ count }) =>
      `${formatNumber(count)} ${count === 1 ? 'bloco será excluído' : 'blocos serão excluídos'}.`,
    'import.summary': ({ tasks, events }) =>
      `${formatNumber(tasks)} ${tasks === 1 ? 'tarefa' : 'tarefas'} e ${formatNumber(events)} ${
        events === 1 ? 'bloco importado' : 'blocos importados'
      }.`,
    'report.summary': ({ rows, hours }) =>
      `${formatNumber(rows)} ${rows === 1 ? 'linha' : 'linhas'} · ${hours}`,
    'report.range': ({ start, end }) => `${start} a ${end}`,
    'report.fileMode.grouped': 'agrupado',
    'report.fileMode.detailed': 'detalhado',
    'report.fileStem': 'relatorio',
    'range.join': ({ start, end }) => `${start} a ${end}`,
    'sync.last': ({ date }) => `Sincronizado em ${date}`,
    'sync.connectedAccount': ({ name }) => `Conectado à conta ${name}.`,
    'sync.connectedAs': ({ name }) => `Conectado como ${name}.`,
    'sync.fizzyAccounts.one': 'Token válido. Uma conta encontrada.',
    'sync.fizzyAccounts.many': ({ count }) => `Token válido. ${count} contas encontradas.`,
    'project.deleteConfirm': ({ name }) =>
      `Excluir o projeto “${name}”? As tarefas ficarão sem projeto.`,
    'color.use': ({ color }) => `Usar a cor ${color}`,
    'error.generic': 'Não foi possível concluir esta ação.',
    'error.database.migrationConflict': 'Não foi possível migrar o banco antigo porque o novo banco já contém dados.',
    'error.backup.invalidFile': 'O arquivo não contém um backup válido.',
    'error.backup.unsupported': 'Formato ou versão de backup não suportado.',
    'error.backup.incomplete': 'O backup está incompleto.',
    'error.backup.invalidRecords': 'O backup contém registros inválidos.',
    'error.backup.invalidMode': 'Modo de importação inválido.',
    'error.backup.invalidJson': 'Não foi possível ler o arquivo JSON.',
    'error.project.invalidColor': 'Escolha uma cor válida para o projeto.',
    'error.task.titleRequired': 'Digite um título para a tarefa.',
    'error.task.duplicate': 'Já existe uma tarefa com esse título.',
    'error.block.invalidPeriod': 'Não foi possível determinar um período válido para o bloco.',
    'error.range.invalidStart': 'O início do período é inválido.',
    'error.range.invalidEnd': 'O fim do período é inválido.',
    'error.range.invalid': 'O período informado é inválido.',
    'error.history.invalidCutoff': 'Escolha uma data de corte válida.',
    'error.project.nameRequired': 'Digite um nome para o projeto.',
    'error.project.duplicate': 'Já existe um projeto com esse nome.',
    'error.project.missing': 'O projeto selecionado não existe mais.',
    'error.task.missing': 'A tarefa selecionada não existe mais.',
    'error.integration.incomplete': 'A configuração da integração está incompleta.',
    'error.sync.prepare': 'Não foi possível preparar as tarefas para sincronização.',
    'error.sync.invalidTask': 'A integração retornou uma tarefa sem identificação ou título.',
    'error.sync.duplicateTask': 'A integração retornou a mesma tarefa mais de uma vez.',
    'error.fizzy.invalidToken': 'O token do Fizzy é inválido ou expirou.',
    'error.fizzy.forbidden': 'O token não tem permissão para ler essas tarefas.',
    'error.fizzy.response': ({ status }) => `O Fizzy respondeu com o erro ${status}.`,
    'error.fizzy.tokenRequired': 'Cole um token de acesso do Fizzy.',
    'error.fizzy.noAccounts': 'O token não dá acesso a nenhuma conta do Fizzy.',
    'error.fizzy.incomplete': 'A conexão com o Fizzy está incompleta.',
    'error.fizzy.invalidTasks': 'O Fizzy retornou uma lista de tarefas inválida.',
    'error.trello.credentialsRequired': 'Informe a API Key e o token de acesso do Trello.',
    'error.trello.network': 'Não foi possível acessar o Trello. Verifique sua conexão.',
    'error.trello.invalidCredentials': 'A API Key ou o token do Trello é inválido ou expirou.',
    'error.trello.forbidden': 'O token não tem permissão para ler esses quadros.',
    'error.trello.response': ({ status }) => `O Trello respondeu com o erro ${status}.`,
    'error.trello.apiKeyRequired': 'Informe a API Key antes de gerar o token.',
    'error.trello.invalidMember': 'O Trello não retornou uma identificação de usuário válida.',
    'error.trello.invalidBoards': 'O Trello retornou uma lista de quadros inválida.',
    'error.trello.boardRequired': 'Escolha ao menos um quadro do Trello.',
    'error.trello.invalidCards': 'O Trello retornou uma lista de cards inválida.',
    'error.trello.popupBlocked': 'O navegador bloqueou a janela de autorização do Trello.'
  },
  en: {
    'app.description': 'Plan tasks in time blocks, with your data stored locally.',
    'task.count': ({ count }) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
    'project.taskCount': ({ count }) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
    'history.deleteCount': ({ count }) =>
      `${formatNumber(count)} ${count === 1 ? 'block deleted' : 'blocks deleted'}.`,
    'history.previewCount': ({ count }) =>
      `${formatNumber(count)} ${count === 1 ? 'block will be deleted' : 'blocks will be deleted'}.`,
    'import.summary': ({ tasks, events }) =>
      `${formatNumber(tasks)} ${tasks === 1 ? 'task' : 'tasks'} and ${formatNumber(events)} ${
        events === 1 ? 'block imported' : 'blocks imported'
      }.`,
    'report.summary': ({ rows, hours }) =>
      `${formatNumber(rows)} ${rows === 1 ? 'row' : 'rows'} · ${hours}`,
    'report.range': ({ start, end }) => `${start} to ${end}`,
    'report.fileMode.grouped': 'grouped',
    'report.fileMode.detailed': 'detailed',
    'report.fileStem': 'report',
    'range.join': ({ start, end }) => `${start} to ${end}`,
    'sync.last': ({ date }) => `Synced on ${date}`,
    'sync.connectedAccount': ({ name }) => `Connected to ${name}.`,
    'sync.connectedAs': ({ name }) => `Connected as ${name}.`,
    'sync.fizzyAccounts.one': 'Valid token. One account found.',
    'sync.fizzyAccounts.many': ({ count }) => `Valid token. ${count} accounts found.`,
    'project.deleteConfirm': ({ name }) =>
      `Delete project “${name}”? Its tasks will be left without a project.`,
    'color.use': ({ color }) => `Use color ${color}`,
    'error.generic': 'This action could not be completed.',
    'error.database.migrationConflict': 'The old database could not be migrated because the new database already contains data.',
    'error.backup.invalidFile': 'The file does not contain a valid backup.',
    'error.backup.unsupported': 'Unsupported backup format or version.',
    'error.backup.incomplete': 'The backup is incomplete.',
    'error.backup.invalidRecords': 'The backup contains invalid records.',
    'error.backup.invalidMode': 'Invalid import mode.',
    'error.backup.invalidJson': 'The JSON file could not be read.',
    'error.project.invalidColor': 'Choose a valid project color.',
    'error.task.titleRequired': 'Enter a task title.',
    'error.task.duplicate': 'A task with this title already exists.',
    'error.block.invalidPeriod': 'A valid time range for the block could not be determined.',
    'error.range.invalidStart': 'The range start is invalid.',
    'error.range.invalidEnd': 'The range end is invalid.',
    'error.range.invalid': 'The selected range is invalid.',
    'error.history.invalidCutoff': 'Choose a valid cutoff date.',
    'error.project.nameRequired': 'Enter a project name.',
    'error.project.duplicate': 'A project with this name already exists.',
    'error.project.missing': 'The selected project no longer exists.',
    'error.task.missing': 'The selected task no longer exists.',
    'error.integration.incomplete': 'The integration settings are incomplete.',
    'error.sync.prepare': 'The tasks could not be prepared for syncing.',
    'error.sync.invalidTask': 'The integration returned a task without an ID or title.',
    'error.sync.duplicateTask': 'The integration returned the same task more than once.',
    'error.fizzy.invalidToken': 'The Fizzy token is invalid or has expired.',
    'error.fizzy.forbidden': 'The token does not have permission to read these tasks.',
    'error.fizzy.response': ({ status }) => `Fizzy returned error ${status}.`,
    'error.fizzy.tokenRequired': 'Paste a Fizzy access token.',
    'error.fizzy.noAccounts': 'The token cannot access any Fizzy account.',
    'error.fizzy.incomplete': 'The Fizzy connection is incomplete.',
    'error.fizzy.invalidTasks': 'Fizzy returned an invalid task list.',
    'error.trello.credentialsRequired': 'Enter the Trello API Key and access token.',
    'error.trello.network': 'Trello could not be reached. Check your connection.',
    'error.trello.invalidCredentials': 'The Trello API Key or token is invalid or has expired.',
    'error.trello.forbidden': 'The token does not have permission to read these boards.',
    'error.trello.response': ({ status }) => `Trello returned error ${status}.`,
    'error.trello.apiKeyRequired': 'Enter the API Key before generating a token.',
    'error.trello.invalidMember': 'Trello did not return a valid user ID.',
    'error.trello.invalidBoards': 'Trello returned an invalid board list.',
    'error.trello.boardRequired': 'Choose at least one Trello board.',
    'error.trello.invalidCards': 'Trello returned an invalid card list.',
    'error.trello.popupBlocked': 'The browser blocked the Trello authorization window.'
  }
};

const STATIC_TEXT = [
  ['Navegação principal', 'Main navigation'],
  ['Planejamento', 'Planning'],
  ['Relatórios', 'Reports'],
  ['Configurações', 'Settings'],
  ['Idioma', 'Language'],
  ['Navegação do calendário', 'Calendar navigation'],
  ['Período anterior', 'Previous period'],
  ['Hoje', 'Today'],
  ['Próximo período', 'Next period'],
  ['Carregando agenda', 'Loading schedule'],
  ['Visão', 'View'],
  ['Mensal', 'Monthly'],
  ['Semanal', 'Weekly'],
  ['Diária', 'Daily'],
  ['2 semanas', '2 weeks'],
  ['3 semanas', '3 weeks'],
  ['Finais de semana mais estreitos', 'Narrower weekends'],
  ['Fim de semana estreito', 'Narrow weekend'],
  ['Ocultar sábado e domingo', 'Hide Saturday and Sunday'],
  ['Ocultar fim de semana', 'Hide weekends'],
  ['Agenda', 'Schedule'],
  ['Mostrar tarefas', 'Show tasks'],
  ['Fechar tarefas', 'Close tasks'],
  ['Ocultar tarefas', 'Hide tasks'],
  ['Tarefas e projetos', 'Tasks and projects'],
  ['Conteúdo da barra lateral', 'Sidebar content'],
  ['Tarefas', 'Tasks'],
  ['Projetos', 'Projects'],
  ['Buscar tarefas', 'Search tasks'],
  ['Adicionar tarefa', 'Add task'],
  ['Arraste para o calendário', 'Drag to the calendar'],
  ['Integrações de tarefas', 'Task integrations'],
  ['Integração de tarefas', 'Task integration'],
  ['Classificação', 'Organization'],
  ['Adicionar projeto', 'Add project'],
  ['Associe cada tarefa a um projeto para destacá-la com uma cor suave no calendário.', 'Assign each task to a project to highlight it with a soft color on the calendar.'],
  ['Análise de tempo', 'Time analysis'],
  ['Escolha um período e os projetos para consolidar os blocos planejados.', 'Choose a period and projects to consolidate planned blocks.'],
  ['Parâmetros', 'Parameters'],
  ['Obrigatórios', 'Required'],
  ['Data inicial', 'Start date'],
  ['Data final', 'End date'],
  ['Escolha um ou mais projetos para incluir.', 'Choose one or more projects to include.'],
  ['Formato', 'Format'],
  ['Agrupado por tarefa', 'Grouped by task'],
  ['Soma todas as horas de cada tarefa.', 'Adds up all hours for each task.'],
  ['Detalhado', 'Detailed'],
  ['Mostra cada período trabalhado em uma linha.', 'Shows each worked period on its own row.'],
  ['Gerar relatório', 'Generate report'],
  ['Resultado', 'Result'],
  ['Defina os parâmetros para gerar um relatório.', 'Set the parameters to generate a report.'],
  ['Exportar CSV', 'Export CSV'],
  ['Exportar PDF', 'Export PDF'],
  ['Nenhum relatório gerado', 'No report generated'],
  ['Os resultados aparecerão aqui e só existem enquanto esta tela estiver aberta.', 'Results will appear here and exist only while this screen is open.'],
  ['Dados e conexões', 'Data and connections'],
  ['Gerencie seus dados locais, backups e aplicativos conectados.', 'Manage your local data, backups, and connected apps.'],
  ['Armazenamento local', 'Local storage'],
  ['Acompanhe o histórico salvo somente neste navegador.', 'Review the history stored only in this browser.'],
  ['Blocos', 'Blocks'],
  ['Bloco mais antigo', 'Oldest block'],
  ['Bloco mais recente', 'Newest block'],
  ['Uso estimado deste site', 'Estimated site usage'],
  ['Gerenciar histórico', 'Manage history'],
  ['Backup do sistema', 'System backup'],
  ['Exporte uma cópia portátil ou importe um backup anterior.', 'Export a portable copy or import an earlier backup.'],
  ['Exportar backup', 'Export backup'],
  ['Importar backup', 'Import backup'],
  ['Aplicativos conectados', 'Connected apps'],
  ['Adicione ou ajuste as fontes usadas pelo botão Sync.', 'Add or configure the sources used by the Sync button.'],
  ['Não conectado', 'Not connected'],
  ['Conectar', 'Connect'],
  ['Redefinir banco de dados', 'Reset database'],
  ['Apaga tarefas, blocos, projetos, preferências e conexões deste navegador.', 'Deletes tasks, blocks, projects, preferences, and connections from this browser.'],
  ['Apagar todos os dados', 'Delete all data'],
  ['Nova tarefa', 'New task'],
  ['Título', 'Title'],
  ['Ex.: Revisar proposta', 'E.g. Review proposal'],
  ['Cancelar', 'Cancel'],
  ['Salvar e adicionar outra', 'Save and add another'],
  ['Salvar e sair', 'Save and close'],
  ['Novo projeto', 'New project'],
  ['Editar projeto', 'Edit project'],
  ['Fechar', 'Close'],
  ['Nome do projeto', 'Project name'],
  ['Ex.: Trabalho', 'E.g. Work'],
  ['Cor', 'Color'],
  ['Cor do projeto', 'Project color'],
  ['Cores sugeridas', 'Suggested colors'],
  ['Salvar projeto', 'Save project'],
  ['Projeto da tarefa', 'Task project'],
  ['Projeto', 'Project'],
  ['Remover tarefa', 'Remove task'],
  ['Remover este bloco', 'Remove this block'],
  ['Salvar', 'Save'],
  ['Zona de perigo', 'Danger zone'],
  ['Apagar todos os dados?', 'Delete all data?'],
  ['Esta ação é irreversível. Tarefas, blocos, projetos, preferências e conexões serão removidos deste navegador.', 'This action is irreversible. Tasks, blocks, projects, preferences, and connections will be removed from this browser.'],
  ['Exporte um backup antes de continuar se quiser recuperar os dados depois.', 'Export a backup before continuing if you may want to restore the data later.'],
  ['Sim, apagar tudo', 'Yes, delete everything'],
  ['Exclua apenas blocos encerrados antes da data escolhida. Tarefas, projetos, preferências, conexões e blocos posteriores serão preservados.', 'Delete only blocks that ended before the selected date. Tasks, projects, preferences, connections, and later blocks will be preserved.'],
  ['Atalhos de período', 'Period shortcuts'],
  ['Manter 6 meses', 'Keep 6 months'],
  ['Manter 1 ano', 'Keep 1 year'],
  ['Manter 2 anos', 'Keep 2 years'],
  ['Excluir blocos encerrados antes de', 'Delete blocks that ended before'],
  ['Escolha uma data para calcular a prévia.', 'Choose a date to calculate the preview.'],
  ['Os relatórios do período apagado não poderão mais ser gerados sem restaurar um backup.', 'Reports for the deleted period cannot be generated again without restoring a backup.'],
  ['Entendo que os blocos selecionados serão excluídos deste navegador.', 'I understand that the selected blocks will be deleted from this browser.'],
  ['Excluir histórico', 'Delete history'],
  ['Como deseja importar?', 'How would you like to import?'],
  ['Mesclar', 'Merge'],
  ['Atualiza IDs iguais e preserva os demais dados.', 'Updates matching IDs and preserves all other data.'],
  ['Substituir', 'Replace'],
  ['Apaga os dados atuais antes de importar.', 'Deletes current data before importing.'],
  ['Conectar ao Fizzy', 'Connect to Fizzy'],
  ['O Rics Time-blocking traz apenas cards em aberto. Ao sincronizar, novos cards entram, títulos são atualizados e cards fechados ou removidos saem da lista. Blocos que já começaram permanecem no histórico.', 'Rics Time-blocking imports only open cards. During sync, new cards are added, titles are updated, and closed or removed cards leave the list. Blocks that have already started remain in history.'],
  ['Um token somente de leitura é suficiente. Ele fica neste navegador e não é incluído nos backups.', 'A read-only token is enough. It stays in this browser and is not included in backups.'],
  ['Token de acesso pessoal', 'Personal access token'],
  ['Cole o token gerado no Fizzy', 'Paste the token generated in Fizzy'],
  ['Token salvo. Preencha apenas para trocar', 'Token saved. Fill this in only to replace it'],
  ['Onde gerar o token', 'Where to generate the token'],
  ['Verificar token', 'Verify token'],
  ['Conta do Fizzy', 'Fizzy account'],
  ['Desconectar', 'Disconnect'],
  ['Salvar e sincronizar', 'Save and sync'],
  ['Conectar ao Trello', 'Connect to Trello'],
  ['Escolha os quadros que deseja acompanhar e marque as listas que representam trabalho concluído. O Rics Time-blocking importa os demais cards abertos.', 'Choose the boards you want to follow and mark the lists that represent completed work. Rics Time-blocking imports the remaining open cards.'],
  ['Use um token somente de leitura. A API Key e o token ficam neste navegador e não entram nos backups.', 'Use a read-only token. The API Key and token stay in this browser and are not included in backups.'],
  ['Token de acesso', 'Access token'],
  ['Cole sua API Key', 'Paste your API Key'],
  ['Cole o token de leitura', 'Paste the read-only token'],
  ['Onde gerar a API Key', 'Where to generate the API Key'],
  ['Gerar token', 'Generate token'],
  ['Verificar acesso', 'Verify access'],
  ['Quadros e listas concluídas', 'Boards and completed lists'],
  ['Marque os quadros e, dentro deles, as listas que não devem ser importadas.', 'Select boards and, within them, the lists that should not be imported.'],
  ['Sem projeto', 'No project'],
  ['Sem histórico', 'No history'],
  ['Data indisponível', 'Date unavailable'],
  ['Não disponível', 'Unavailable'],
  ['Configurar', 'Configure'],
  ['Sincronizando…', 'Syncing…'],
  ['Sincronizar aplicativos conectados', 'Sync connected apps'],
  ['Conecte um aplicativo nas Configurações', 'Connect an app in Settings'],
  ['Sem projetos ainda', 'No projects yet'],
  ['Crie um projeto para organizar tarefas e dar cor aos seus blocos.', 'Create a project to organize tasks and add color to blocks.'],
  ['Editar projeto', 'Edit project'],
  ['Excluir projeto', 'Delete project'],
  ['Sua lista está livre', 'Your list is clear'],
  ['Use o botão “+” para adicionar sua primeira tarefa.', 'Use the “+” button to add your first task.'],
  ['Nenhuma tarefa encontrada', 'No tasks found'],
  ['Tente buscar por outro termo.', 'Try searching for another term.'],
  ['Arrastar tarefa', 'Drag task'],
  ['Excluir tarefa', 'Delete task'],
  ['Escolha hoje ou uma data anterior para calcular a prévia.', 'Choose today or an earlier date to calculate the preview.'],
  ['Calculando blocos elegíveis…', 'Calculating eligible blocks…'],
  ['Nenhum bloco será excluído com esta data.', 'No blocks will be deleted with this date.'],
  ['A data final deve ser igual ou posterior à data inicial.', 'The end date must be the same as or later than the start date.'],
  ['Escolha ao menos um projeto.', 'Choose at least one project.'],
  ['Nenhum bloco encontrado para os filtros escolhidos.', 'No blocks found for the selected filters.'],
  ['Sem resultados neste período', 'No results for this period'],
  ['Tente ajustar o intervalo ou os projetos selecionados.', 'Try adjusting the date range or selected projects.'],
  ['Tarefa', 'Task'],
  ['Data', 'Date'],
  ['Início', 'Start'],
  ['Fim', 'End'],
  ['Horas', 'Hours'],
  ['Total de horas', 'Total hours'],
  ['Gerando PDF…', 'Generating PDF…'],
  ['Excluindo…', 'Deleting history…'],
  ['Apagando…', 'Deleting all data…'],
  ['Backup exportado.', 'Backup exported.'],
  ['Projeto excluído.', 'Project deleted.'],
  ['Projeto excluído. As tarefas relacionadas ficaram sem projeto.', 'Project deleted. Related tasks were left without a project.'],
  ['A tarefa original não está mais disponível, mas este bloco ainda pode ser removido.', 'The original task is no longer available, but this block can still be removed.'],
  ['A tarefa original não está mais disponível para edição.', 'The original task is no longer available for editing.'],
  ['A tarefa original não está mais disponível para remoção.', 'The original task is no longer available for removal.'],
  ['Verifique o novo token antes de salvar.', 'Verify the new token before saving.'],
  ['Verifique o token e escolha uma conta.', 'Verify the token and choose an account.'],
  ['Verifique a nova API Key e o token antes de salvar.', 'Verify the new API Key and token before saving.'],
  ['Verifique o acesso e escolha ao menos um quadro.', 'Verify access and choose at least one board.'],
  ['Não importar cards destas listas', 'Do not import cards from these lists'],
  ['Não foi possível abrir o Rics Time-blocking', 'Rics Time-blocking could not be opened'],
  ['Tentar novamente', 'Try again']
];

const PT_TO_EN = new Map(STATIC_TEXT);
const EN_TO_PT = new Map(STATIC_TEXT.map(([pt, en]) => [en, pt]));
let activeLocale = detectLocale();

export function normalizeLocale(locale) {
  return String(locale || '').toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
}

export function detectLocale(languages = globalThis.navigator?.languages || [globalThis.navigator?.language]) {
  return Array.from(languages || []).some((locale) => String(locale || '').toLowerCase().startsWith('en'))
    ? 'en'
    : 'pt-BR';
}

export function setLocale(locale) {
  activeLocale = normalizeLocale(locale);
  return activeLocale;
}

export function getLocale() {
  return activeLocale;
}

export function t(key, params = {}) {
  const message = MESSAGES[activeLocale]?.[key] ?? MESSAGES['pt-BR'][key] ?? key;
  return typeof message === 'function' ? message(params) : message;
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(activeLocale, options).format(value);
}

export function formatDate(value, options) {
  return new Intl.DateTimeFormat(activeLocale, options).format(value);
}

export function formatLongDuration(hours) {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (activeLocale === 'en') {
    const hoursLabel = `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`;
    const minutesLabel = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    if (!minutes) return hoursLabel;
    if (!wholeHours) return minutesLabel;
    return `${hoursLabel} and ${minutesLabel}`;
  }
  const hoursLabel = `${wholeHours} ${wholeHours === 1 ? 'hora' : 'horas'}`;
  const minutesLabel = `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  if (!minutes) return hoursLabel;
  if (!wholeHours) return minutesLabel;
  return `${hoursLabel} e ${minutesLabel}`;
}

export function translateLiteral(value, locale = activeLocale) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return value;
  const translated = normalizeLocale(locale) === 'en'
    ? PT_TO_EN.get(normalized) || normalized
    : EN_TO_PT.get(normalized) || normalized;
  return translated;
}

export function localizeTree(root, locale = activeLocale) {
  if (!root) return;
  const normalizedLocale = normalizeLocale(locale);
  const documentRef = root.ownerDocument || root;
  const walker = documentRef.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.parentElement?.closest('[data-i18n-skip]')) {
      node = walker.nextNode();
      continue;
    }
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (trimmed) {
      const translated = translateLiteral(trimmed, normalizedLocale);
      if (translated !== trimmed) {
        const leading = raw.match(/^\s*/)?.[0] || '';
        const trailing = raw.match(/\s*$/)?.[0] || '';
        node.nodeValue = `${leading}${translated}${trailing}`;
      }
    }
    node = walker.nextNode();
  }

  const elements = root.querySelectorAll ? [root, ...root.querySelectorAll('*')] : [];
  for (const element of elements) {
    if (!(element instanceof Element)) continue;
    if (element.matches('[data-i18n-skip]') || element.closest('[data-i18n-skip]')) continue;
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      if (!element.hasAttribute(attribute)) continue;
      element.setAttribute(attribute, translateLiteral(element.getAttribute(attribute), normalizedLocale));
    }
  }
}

export function localizedError(error) {
  if (error?.code && MESSAGES[activeLocale]?.[error.code]) {
    return t(error.code, error.params);
  }
  const translated = translateLiteral(error?.message || '', activeLocale);
  return translated && translated !== error?.message ? translated : t('error.generic');
}
