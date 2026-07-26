import '@toast-ui/calendar/toastui-calendar.min.css';
import './icons.css';
import './style.css';

import { registerSW } from 'virtual:pwa-register';
import { exportBackup, importBackup } from './backup.js';
import { createCalendar } from './calendar.js';
import {
  addEvent,
  addProject,
  addTask,
  countHistoricalEvents,
  deleteEvent,
  deleteHistoricalEvents,
  deleteIntegration,
  deleteProject,
  deleteTaskAndFutureEvents,
  getDatabaseStats,
  getIntegration,
  getSetting,
  getTask,
  listEventsInRange,
  listProjects,
  listTasks,
  prepareDatabase,
  resetDatabase,
  saveIntegration,
  setSetting,
  syncExternalTasks,
  updateEvent,
  updateProject,
  updateTaskProject
} from './db.js';
import { fetchFizzyAccounts, fetchOpenFizzyCards } from './fizzy.js';
import {
  fetchOpenTrelloCards,
  fetchTrelloSetup,
  trelloAuthorizationUrl
} from './trello.js';
import {
  eventColorsForProject,
  PROJECT_COLOR_PRESETS,
  taskColorsForProject
} from './project-colors.js';
import {
  formatHours,
  generateReport,
  REPORT_UNASSIGNED_PROJECT,
  reportCsv,
  reportPdf
} from './reports.js';
import { appError } from './app-error.js';
import {
  detectLocale,
  formatDate,
  formatNumber,
  getLocale,
  localizedError,
  localizeTree,
  normalizeLocale,
  setLocale,
  t,
  translateLiteral
} from './i18n.js';

const DEFAULT_BLOCK_DURATION_MINUTES = 30;
const CALENDAR_RANGE_MARGIN_DAYS = 7;
const TASK_SOURCES = {
  fizzy: {
    label: 'Fizzy',
    icon: '/fizzy.png'
  },
  trello: {
    label: 'Trello',
    icon: '/trello.svg'
  }
};

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="app-shell" data-sidebar="visible" data-screen="planning">
    <header class="global-nav">
      <div class="global-nav-start">
        <div class="brand" aria-label="Rics Time-blocking">
          <span class="brand-mark" aria-hidden="true"><span></span></span>
          <span>Rics Time-blocking</span>
        </div>
        <a
          class="header-donation-link"
          href="https://ko-fi.com/ricsilva"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Apoie o Rics Time-blocking no Ko-fi (abre em uma nova aba)"
          title="Apoie o Rics Time-blocking no Ko-fi"
        >
          <img src="/giphy.webp" alt="" aria-hidden="true" />
        </a>
      </div>

      <nav class="app-navigation" aria-label="Navegação principal">
        <button class="app-navigation-link is-active" id="planning-navigation" type="button" aria-current="page" title="Planejamento">
          <i class="ph ph-calendar-blank" aria-hidden="true"></i>
          <span>Planejamento</span>
        </button>
        <button class="app-navigation-link" id="reports-navigation" type="button" title="Relatórios">
          <i class="ph ph-chart-bar" aria-hidden="true"></i>
          <span>Relatórios</span>
        </button>
      </nav>

      <div class="global-nav-end">
        <div class="language-switch" role="group" aria-label="Idioma">
          <button type="button" data-locale="pt-BR" lang="pt-BR">PT</button>
          <button type="button" data-locale="en" lang="en">EN</button>
        </div>
        <button class="icon-button global-settings-button" id="settings-navigation" type="button" aria-label="Configurações" title="Configurações">
          <i class="ph ph-gear-six" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <section class="planning-screen" aria-label="Planejamento">
    <header class="topbar">

      <nav class="date-navigation" aria-label="Navegação do calendário">
        <button class="icon-button" id="previous-range" type="button" aria-label="Período anterior" title="Período anterior">
          <i class="ph ph-caret-left" aria-hidden="true"></i>
        </button>
        <button class="text-button" id="today-button" type="button">Hoje</button>
        <button class="icon-button" id="next-range" type="button" aria-label="Próximo período" title="Próximo período">
          <i class="ph ph-caret-right" aria-hidden="true"></i>
        </button>
      </nav>

      <h1 id="range-title" class="range-title" aria-live="polite">Carregando agenda</h1>

      <div class="topbar-actions">
        <label class="select-control" for="view-select">
          <span class="sr-only">Visão</span>
          <i class="ph ph-calendar-blank" aria-hidden="true"></i>
          <select id="view-select">
            <option value="month">Mensal</option>
            <option value="week" selected>Semanal</option>
            <option value="day">Diária</option>
            <option value="2weeks">2 semanas</option>
            <option value="3weeks">3 semanas</option>
          </select>
        </label>

        <button class="option-button" id="narrow-weekends" type="button" aria-pressed="false" title="Finais de semana mais estreitos">
          <i class="ph ph-arrows-in-line-horizontal" aria-hidden="true"></i>
          <span class="option-label">Fim de semana estreito</span>
        </button>

        <button class="option-button" id="hide-weekends" type="button" aria-pressed="false" title="Ocultar sábado e domingo">
          <i class="ph ph-eye-slash" aria-hidden="true"></i>
          <span class="option-label">Ocultar fim de semana</span>
        </button>

      </div>
    </header>

    <main class="workspace">
      <section class="calendar-pane" aria-label="Agenda">
        <div id="calendar" class="calendar-container"></div>
      </section>

      <button class="sidebar-restore" id="sidebar-restore" type="button" aria-label="Mostrar tarefas" title="Mostrar tarefas">
        <i class="ph ph-list-bullets" aria-hidden="true"></i>
        <span>Tarefas</span>
      </button>

      <button class="sidebar-scrim" id="sidebar-scrim" type="button" aria-label="Fechar tarefas"></button>

      <aside class="task-sidebar" aria-label="Tarefas e projetos">
        <div class="sidebar-navigation">
          <div class="sidebar-tabs" role="tablist" aria-label="Conteúdo da barra lateral">
            <button class="sidebar-tab is-active" id="tasks-tab" type="button" role="tab" aria-selected="true" aria-controls="tasks-panel">
              Tarefas
            </button>
            <button class="sidebar-tab" id="projects-tab" type="button" role="tab" aria-selected="false" aria-controls="projects-panel">
              Projetos
            </button>
          </div>
          <button class="icon-button" id="sidebar-toggle" type="button" aria-label="Ocultar tarefas" title="Ocultar tarefas">
            <i class="ph ph-sidebar-simple" aria-hidden="true"></i>
          </button>
        </div>

        <section class="sidebar-panel task-panel" id="tasks-panel" role="tabpanel" aria-labelledby="tasks-tab">
        <div class="task-search">
          <label class="sr-only" for="task-search">Buscar tarefas</label>
          <div class="task-search-row">
            <input
              id="task-search"
              type="search"
              autocomplete="off"
              placeholder="Buscar tarefas"
            />
            <button class="primary-icon-button" id="add-task-button" type="button" aria-label="Adicionar tarefa" title="Adicionar tarefa">
              <i class="ph ph-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="task-list-header">
          <span id="task-count">0 tarefas</span>
          <span>Arraste para o calendário</span>
        </div>
        <div id="task-list" class="task-list" aria-live="polite"></div>

        <div class="task-integrations" aria-label="Integrações de tarefas">
          <button class="integration-sync-button sync-all-button" id="sync-all-button" type="button" disabled>
            <span class="sync-all-icons" id="sync-all-icons" aria-hidden="true"></span>
            <strong>Sync</strong>
            <i class="ph ph-arrow-clockwise" aria-hidden="true"></i>
          </button>
        </div>
        </section>

        <section class="sidebar-panel project-panel" id="projects-panel" role="tabpanel" aria-labelledby="projects-tab" hidden>
          <div class="project-panel-header">
            <div>
              <p class="project-panel-kicker">Classificação</p>
              <h3>Projetos</h3>
            </div>
            <button class="primary-icon-button" id="add-project-button" type="button" aria-label="Adicionar projeto" title="Adicionar projeto">
              <i class="ph ph-plus" aria-hidden="true"></i>
            </button>
          </div>
          <p class="project-panel-copy">Associe cada tarefa a um projeto para destacá-la com uma cor suave no calendário.</p>
          <div id="project-list" class="project-list" aria-live="polite"></div>
        </section>
      </aside>
    </main>
    </section>

    <section class="reports-screen" id="reports-screen" aria-labelledby="reports-heading" hidden>
      <header class="reports-screen-heading">
        <div>
          <p class="dialog-kicker">Análise de tempo</p>
          <h1 id="reports-heading">Relatórios</h1>
          <p>Escolha um período e os projetos para consolidar os blocos planejados.</p>
        </div>
      </header>

      <div class="reports-layout">
        <form class="report-filters" id="report-form">
          <div class="report-filter-heading">
            <h2>Parâmetros</h2>
            <span>Obrigatórios</span>
          </div>

          <div class="report-date-fields">
            <label class="field">
              <span>Data inicial</span>
              <input id="report-start-date" type="date" required />
            </label>
            <label class="field">
              <span>Data final</span>
              <input id="report-end-date" type="date" required />
            </label>
          </div>

          <fieldset class="report-project-filter">
            <legend>Projetos</legend>
            <p>Escolha um ou mais projetos para incluir.</p>
            <div id="report-project-options" class="report-project-options"></div>
          </fieldset>

          <fieldset class="report-mode-filter">
            <legend>Formato</legend>
            <label class="report-radio-option">
              <input type="radio" name="report-mode" value="grouped" checked />
              <span><strong>Agrupado por tarefa</strong><small>Soma todas as horas de cada tarefa.</small></span>
            </label>
            <label class="report-radio-option">
              <input type="radio" name="report-mode" value="detailed" />
              <span><strong>Detalhado</strong><small>Mostra cada período trabalhado em uma linha.</small></span>
            </label>
          </fieldset>

          <p id="report-form-status" class="report-form-status" role="status"></p>
          <button class="primary-button report-generate-button" id="report-generate-button" type="submit" disabled>Gerar relatório</button>
          <a
            class="kofi-badge-link report-donation-link"
            href="https://ko-fi.com/ricsilva"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apoie o Rics Time-blocking no Ko-fi (abre em uma nova aba)"
          >
            <img src="/support_me_on_kofi_badge_beige.webp" alt="" aria-hidden="true" />
          </a>
        </form>

        <section class="report-results" aria-live="polite">
          <div class="report-results-heading">
            <div>
              <h2>Resultado</h2>
              <p id="report-results-summary">Defina os parâmetros para gerar um relatório.</p>
            </div>
            <div class="report-export-actions">
              <button class="secondary-button" id="report-export-button" type="button" disabled>
                <i class="ph ph-download-simple" aria-hidden="true"></i>
                Exportar CSV
              </button>
              <button class="secondary-button" id="report-export-pdf-button" type="button" disabled>
                <i class="ph ph-file-pdf" aria-hidden="true"></i>
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>
          <div id="report-results-content" class="report-results-content">
            <div class="report-empty-state">
              <i class="ph ph-hard-drives" aria-hidden="true"></i>
              <h3>Nenhum relatório gerado</h3>
              <p>Os resultados aparecerão aqui e só existem enquanto esta tela estiver aberta.</p>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="settings-screen" id="settings-screen" aria-labelledby="settings-heading" hidden>
      <header class="settings-screen-heading">
        <div>
          <p class="dialog-kicker">Dados e conexões</p>
          <h1 id="settings-heading">Configurações</h1>
          <p>Gerencie seus dados locais, backups e aplicativos conectados.</p>
        </div>
      </header>

      <div class="settings-layout">
        <section class="settings-section settings-support-section">
          <div class="settings-support-copy">
            <h2>Curtiu? Fortalece o projeto.</h2>
            <p>Se o Rics já salvou seu dia de algum jeito, considere bancar um cafezinho pra manter o projeto vivo — sem pressão. ☕</p>
          </div>
          <a
            class="kofi-badge-link settings-donation-link"
            href="https://ko-fi.com/ricsilva"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apoie o Rics Time-blocking no Ko-fi (abre em uma nova aba)"
          >
            <img src="/support_me_on_kofi_badge_beige.webp" alt="" aria-hidden="true" />
          </a>
        </section>

        <section class="settings-section settings-storage-section">
          <div class="settings-section-heading">
            <span class="settings-section-icon" aria-hidden="true">
              <i class="ph ph-clock-counter-clockwise"></i>
            </span>
            <div>
              <h2>Armazenamento local</h2>
              <p>Acompanhe o histórico salvo somente neste navegador.</p>
            </div>
          </div>
          <dl class="storage-stats" aria-live="polite">
            <div>
              <dt>Tarefas</dt>
              <dd id="storage-task-count">—</dd>
            </div>
            <div>
              <dt>Blocos</dt>
              <dd id="storage-event-count">—</dd>
            </div>
            <div>
              <dt>Bloco mais antigo</dt>
              <dd id="storage-oldest-event">—</dd>
            </div>
            <div>
              <dt>Bloco mais recente</dt>
              <dd id="storage-newest-event">—</dd>
            </div>
            <div class="storage-usage-stat">
              <dt>Uso estimado deste site</dt>
              <dd id="storage-estimated-usage">—</dd>
            </div>
          </dl>
          <div class="settings-actions">
            <button class="secondary-button" id="manage-history-button" type="button">
              <i class="ph ph-clock-counter-clockwise" aria-hidden="true"></i>
              Gerenciar histórico
            </button>
          </div>
        </section>

        <section class="settings-section">
          <div class="settings-section-heading">
            <span class="settings-section-icon" aria-hidden="true">
              <i class="ph ph-hard-drives"></i>
            </span>
            <div>
              <h2>Backup do sistema</h2>
              <p>Exporte uma cópia portátil ou importe um backup anterior.</p>
            </div>
          </div>
          <div class="settings-actions">
            <button class="secondary-button" id="export-button" type="button">
              <i class="ph ph-download-simple" aria-hidden="true"></i>
              Exportar backup
            </button>
            <button class="secondary-button" id="import-button" type="button">
              <i class="ph ph-upload-simple" aria-hidden="true"></i>
              Importar backup
            </button>
          </div>
        </section>

        <section class="settings-section settings-integrations-section">
          <div class="settings-section-heading">
            <span class="settings-section-icon" aria-hidden="true">
              <i class="ph ph-arrows-clockwise"></i>
            </span>
            <div>
              <h2>Aplicativos conectados</h2>
              <p>Adicione ou ajuste as fontes usadas pelo botão Sync.</p>
            </div>
          </div>
          <div class="settings-integration-list">
            <article class="settings-integration-item">
              <img src="/fizzy.png" alt="" aria-hidden="true" />
              <div>
                <h3>Fizzy</h3>
                <p id="settings-fizzy-status">Não conectado</p>
              </div>
              <button class="secondary-button" id="fizzy-settings-button" type="button">
                Conectar
              </button>
            </article>
            <article class="settings-integration-item">
              <img src="/trello.svg" alt="" aria-hidden="true" />
              <div>
                <h3>Trello</h3>
                <p id="settings-trello-status">Não conectado</p>
              </div>
              <button class="secondary-button" id="trello-settings-button" type="button">
                Conectar
              </button>
            </article>
          </div>
        </section>

        <section class="settings-section settings-danger-section">
          <div class="settings-section-heading">
            <span class="settings-section-icon" aria-hidden="true">
              <i class="ph ph-warning-circle"></i>
            </span>
            <div>
              <h2>Redefinir banco de dados</h2>
              <p>Apaga tarefas, blocos, projetos, preferências e conexões deste navegador.</p>
            </div>
          </div>
          <div class="settings-actions">
            <button class="danger-button" id="reset-database-button" type="button">
              Apagar todos os dados
            </button>
          </div>
        </section>
      </div>
    </section>
  </div>

  <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>

  <div id="calendar-drop-preview" class="calendar-drop-preview" aria-hidden="true">
    <span id="calendar-drop-preview-title" class="calendar-drop-preview-title"></span>
    <span class="calendar-drop-preview-duration">30 min</span>
  </div>

  <dialog id="task-dialog" class="app-dialog task-dialog">
    <form id="add-task-form">
      <div class="dialog-heading">
        <div>
          <p class="dialog-kicker">Adicionar tarefa</p>
          <h2>Nova tarefa</h2>
        </div>
      </div>

      <label class="field task-title-field">
        <span>Título</span>
        <input
          id="add-task-title"
          name="title"
          type="text"
          maxlength="120"
          autocomplete="off"
          placeholder="Ex.: Revisar proposta"
          required
        />
      </label>

      <p id="add-task-status" class="task-form-status" role="status" aria-live="polite"></p>

      <div class="dialog-actions task-dialog-actions">
        <button class="secondary-button task-cancel" type="button" data-close-dialog>Cancelar</button>
        <button class="secondary-button task-save-continue" type="submit" data-save-mode="continue">
          Salvar e adicionar outra
        </button>
        <button class="primary-button task-save-close" type="submit" data-save-mode="close">
          Salvar e sair
        </button>
      </div>
    </form>
  </dialog>

  <dialog id="project-dialog" class="app-dialog compact-dialog">
    <form id="project-form">
      <div class="dialog-heading">
        <div>
          <p class="dialog-kicker">Classificação</p>
          <h2 id="project-dialog-title">Novo projeto</h2>
        </div>
        <button class="icon-button dialog-close" type="button" data-close-dialog aria-label="Fechar" title="Fechar">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>
      <label class="field">
        <span>Nome do projeto</span>
        <input id="project-name" type="text" maxlength="80" autocomplete="off" placeholder="Ex.: Trabalho" required />
      </label>
      <label class="field project-color-field">
        <span>Cor</span>
        <span class="project-color-control">
          <input id="project-color" type="color" value="#2D6A57" aria-label="Cor do projeto" />
          <output id="project-color-value" for="project-color">#2D6A57</output>
        </span>
      </label>
      <div class="project-color-presets" id="project-color-presets" aria-label="Cores sugeridas"></div>
      <p id="project-form-status" class="task-form-status" role="status" aria-live="polite"></p>
      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
        <button class="primary-button" type="submit">Salvar projeto</button>
      </div>
    </form>
  </dialog>

  <dialog id="task-project-dialog" class="app-dialog compact-dialog">
    <form id="task-project-form">
      <div class="dialog-heading">
        <div>
          <p class="dialog-kicker">Projeto da tarefa</p>
          <h2 id="task-project-dialog-title" data-i18n-skip></h2>
        </div>
        <button class="icon-button dialog-close" type="button" data-close-dialog aria-label="Fechar" title="Fechar">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>
      <label class="field">
        <span>Projeto</span>
        <select id="task-project-dialog-select"></select>
      </label>
      <p id="task-project-form-status" class="task-form-status" role="status" aria-live="polite"></p>
      <div class="dialog-actions task-project-dialog-actions">
        <button class="danger-button" id="remove-task-or-event" type="button">
          <i class="ph ph-trash" aria-hidden="true"></i>
          <span>Remover tarefa</span>
        </button>
        <span class="dialog-action-spacer"></span>
        <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
        <button class="primary-button" id="save-task-project" type="submit">Salvar</button>
      </div>
    </form>
  </dialog>

  <dialog id="reset-database-dialog" class="app-dialog compact-dialog">
    <div class="dialog-heading">
      <div>
        <p class="dialog-kicker">Zona de perigo</p>
        <h2>Apagar todos os dados?</h2>
      </div>
    </div>
    <div class="reset-warning">
      <i class="ph ph-warning-circle" aria-hidden="true"></i>
      <p>
        Esta ação é irreversível. Tarefas, blocos, projetos, preferências e conexões
        serão removidos deste navegador.
      </p>
    </div>
    <p class="dialog-copy">Exporte um backup antes de continuar se quiser recuperar os dados depois.</p>
    <div class="dialog-actions">
      <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
      <button class="danger-button" id="confirm-reset-database" type="button">
        Sim, apagar tudo
      </button>
    </div>
  </dialog>

  <dialog id="history-dialog" class="app-dialog history-dialog" aria-labelledby="history-dialog-title">
    <div class="dialog-heading">
      <div>
        <p class="dialog-kicker">Armazenamento local</p>
        <h2 id="history-dialog-title">Gerenciar histórico</h2>
      </div>
      <button class="icon-button dialog-close" type="button" data-close-dialog aria-label="Fechar" title="Fechar">
        <i class="ph ph-x" aria-hidden="true"></i>
      </button>
    </div>
    <p class="dialog-copy">
      Exclua apenas blocos encerrados antes da data escolhida. Tarefas, projetos,
      preferências, conexões e blocos posteriores serão preservados.
    </p>
    <div class="history-presets" aria-label="Atalhos de período">
      <button class="secondary-button" type="button" data-history-months="6">Manter 6 meses</button>
      <button class="secondary-button" type="button" data-history-months="12">Manter 1 ano</button>
      <button class="secondary-button" type="button" data-history-months="24">Manter 2 anos</button>
    </div>
    <label class="field">
      <span>Excluir blocos encerrados antes de</span>
      <input id="history-cutoff" type="date" />
    </label>
    <div id="history-preview" class="history-preview" role="status" aria-live="polite">
      Escolha uma data para calcular a prévia.
    </div>
    <div class="reset-warning history-warning">
      <i class="ph ph-warning-circle" aria-hidden="true"></i>
      <p>Os relatórios do período apagado não poderão mais ser gerados sem restaurar um backup.</p>
    </div>
    <label class="history-confirmation">
      <input id="history-confirmation" type="checkbox" />
      <span>Entendo que os blocos selecionados serão excluídos deste navegador.</span>
    </label>
    <div class="dialog-actions history-dialog-actions">
      <button class="secondary-button" id="history-export-button" type="button">
        <i class="ph ph-download-simple" aria-hidden="true"></i>
        Exportar backup
      </button>
      <span class="dialog-action-spacer"></span>
      <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
      <button class="danger-button" id="confirm-history-cleanup" type="button" disabled>
        Excluir histórico
      </button>
    </div>
  </dialog>

  <dialog id="import-dialog" class="app-dialog compact-dialog">
    <div class="dialog-heading">
      <div>
        <p class="dialog-kicker">Importar backup</p>
        <h2>Como deseja importar?</h2>
      </div>
      <button class="icon-button dialog-close" type="button" data-close-dialog aria-label="Fechar" title="Fechar">
        <i class="ph ph-x" aria-hidden="true"></i>
      </button>
    </div>
    <p id="import-file-name" class="dialog-copy" data-i18n-skip></p>
    <div class="import-options">
      <button class="import-option" type="button" data-import-mode="merge">
        <strong>Mesclar</strong>
        <span>Atualiza IDs iguais e preserva os demais dados.</span>
      </button>
      <button class="import-option danger-option" type="button" data-import-mode="replace">
        <strong>Substituir</strong>
        <span>Apaga os dados atuais antes de importar.</span>
      </button>
    </div>
  </dialog>

  <dialog id="fizzy-dialog" class="app-dialog integration-dialog">
    <form id="fizzy-form">
      <div class="dialog-heading integration-dialog-heading">
        <div class="integration-title">
          <img src="/fizzy.png" alt="" aria-hidden="true" />
          <div>
            <p class="dialog-kicker">Integração de tarefas</p>
            <h2>Conectar ao Fizzy</h2>
          </div>
        </div>
        <button class="icon-button dialog-close" type="button" data-close-dialog aria-label="Fechar" title="Fechar">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <p class="dialog-copy">
        O Rics Time-blocking traz apenas cards em aberto. Ao sincronizar, novos cards entram,
        títulos são atualizados e cards fechados ou removidos saem da lista.
        Blocos que já começaram permanecem no histórico.
      </p>

      <div class="integration-privacy-note">
        <i class="ph ph-shield-check" aria-hidden="true"></i>
        <span>Um token somente de leitura é suficiente. Ele fica neste navegador e não é incluído nos backups.</span>
      </div>

      <label class="field">
        <span>Token de acesso pessoal</span>
        <input
          id="fizzy-token"
          name="token"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="Cole o token gerado no Fizzy"
        />
      </label>

      <div class="integration-verify-row">
        <a href="https://app.fizzy.do/" target="_blank" rel="noreferrer">
          Onde gerar o token
          <i class="ph ph-arrow-square-out" aria-hidden="true"></i>
        </a>
        <button class="secondary-button" id="fizzy-verify-button" type="button">
          <i class="ph ph-check-circle" aria-hidden="true"></i>
          Verificar token
        </button>
      </div>

      <label class="field" id="fizzy-account-field" hidden>
        <span>Conta do Fizzy</span>
        <select id="fizzy-account" name="account" required></select>
      </label>

      <p id="fizzy-form-status" class="integration-form-status" role="status"></p>

      <div class="dialog-actions integration-dialog-actions">
        <button class="secondary-button disconnect-button" id="fizzy-disconnect-button" type="button" hidden>
          Desconectar
        </button>
        <span class="dialog-action-spacer"></span>
        <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
        <button class="primary-button" id="fizzy-save-button" type="submit" disabled>
          <i class="ph ph-arrows-clockwise" aria-hidden="true"></i>
          Salvar e sincronizar
        </button>
      </div>
    </form>
  </dialog>

  <dialog id="trello-dialog" class="app-dialog integration-dialog trello-dialog">
    <form id="trello-form">
      <div class="dialog-heading integration-dialog-heading">
        <div class="integration-title">
          <img src="/trello.svg" alt="" aria-hidden="true" />
          <div>
            <p class="dialog-kicker">Integração de tarefas</p>
            <h2>Conectar ao Trello</h2>
          </div>
        </div>
        <button class="icon-button dialog-close" type="button" data-close-dialog aria-label="Fechar" title="Fechar">
          <i class="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>

      <p class="dialog-copy">
        Escolha os quadros que deseja acompanhar e marque as listas que
        representam trabalho concluído. O Rics Time-blocking importa os demais cards abertos.
      </p>

      <div class="integration-privacy-note">
        <i class="ph ph-shield-check" aria-hidden="true"></i>
        <span>Use um token somente de leitura. A API Key e o token ficam neste navegador e não entram nos backups.</span>
      </div>

      <div class="field-grid trello-credential-grid">
        <label class="field">
          <span>API Key</span>
          <input
            id="trello-api-key"
            name="apiKey"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="Cole sua API Key"
          />
        </label>

        <label class="field">
          <span>Token de acesso</span>
          <input
            id="trello-token"
            name="token"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="Cole o token de leitura"
          />
        </label>
      </div>

      <div class="trello-auth-actions">
        <a href="https://trello.com/apps/admin" target="_blank" rel="noreferrer">
          Onde gerar a API Key
          <i class="ph ph-arrow-square-out" aria-hidden="true"></i>
        </a>
        <span class="dialog-action-spacer"></span>
        <button class="secondary-button" id="trello-authorize-button" type="button">
          Gerar token
        </button>
        <button class="secondary-button" id="trello-verify-button" type="button">
          <i class="ph ph-check-circle" aria-hidden="true"></i>
          Verificar acesso
        </button>
      </div>

      <section id="trello-selection" class="trello-selection" hidden>
        <div class="trello-selection-heading">
          <div>
            <h3>Quadros e listas concluídas</h3>
            <p>Marque os quadros e, dentro deles, as listas que não devem ser importadas.</p>
          </div>
          <span id="trello-board-count"></span>
        </div>
        <div id="trello-board-list" class="trello-board-list"></div>
      </section>

      <p id="trello-form-status" class="integration-form-status" role="status"></p>

      <div class="dialog-actions integration-dialog-actions">
        <button class="secondary-button disconnect-button" id="trello-disconnect-button" type="button" hidden>
          Desconectar
        </button>
        <span class="dialog-action-spacer"></span>
        <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
        <button class="primary-button" id="trello-save-button" type="submit" disabled>
          <i class="ph ph-arrows-clockwise" aria-hidden="true"></i>
          Salvar e sincronizar
        </button>
      </div>
    </form>
  </dialog>

  <input id="import-file" type="file" accept="application/json,.json" hidden />
`;

const elements = {
  shell: document.querySelector('.app-shell'),
  planningNavigation: document.querySelector('#planning-navigation'),
  reportsNavigation: document.querySelector('#reports-navigation'),
  settingsNavigation: document.querySelector('#settings-navigation'),
  localeButtons: Array.from(document.querySelectorAll('[data-locale]')),
  reportsScreen: document.querySelector('#reports-screen'),
  settingsScreen: document.querySelector('#settings-screen'),
  reportForm: document.querySelector('#report-form'),
  reportStartDate: document.querySelector('#report-start-date'),
  reportEndDate: document.querySelector('#report-end-date'),
  reportProjectOptions: document.querySelector('#report-project-options'),
  reportFormStatus: document.querySelector('#report-form-status'),
  reportGenerateButton: document.querySelector('#report-generate-button'),
  reportResultsSummary: document.querySelector('#report-results-summary'),
  reportResultsContent: document.querySelector('#report-results-content'),
  reportExportButton: document.querySelector('#report-export-button'),
  reportExportPdfButton: document.querySelector('#report-export-pdf-button'),
  rangeTitle: document.querySelector('#range-title'),
  viewSelect: document.querySelector('#view-select'),
  calendar: document.querySelector('#calendar'),
  calendarPane: document.querySelector('.calendar-pane'),
  dropPreview: document.querySelector('#calendar-drop-preview'),
  dropPreviewTitle: document.querySelector('#calendar-drop-preview-title'),
  tasksTab: document.querySelector('#tasks-tab'),
  projectsTab: document.querySelector('#projects-tab'),
  tasksPanel: document.querySelector('#tasks-panel'),
  projectsPanel: document.querySelector('#projects-panel'),
  taskSearch: document.querySelector('#task-search'),
  addTaskButton: document.querySelector('#add-task-button'),
  taskDialog: document.querySelector('#task-dialog'),
  addTaskForm: document.querySelector('#add-task-form'),
  addTaskTitle: document.querySelector('#add-task-title'),
  addTaskStatus: document.querySelector('#add-task-status'),
  addProjectButton: document.querySelector('#add-project-button'),
  projectList: document.querySelector('#project-list'),
  projectDialog: document.querySelector('#project-dialog'),
  projectForm: document.querySelector('#project-form'),
  projectDialogTitle: document.querySelector('#project-dialog-title'),
  projectName: document.querySelector('#project-name'),
  projectColor: document.querySelector('#project-color'),
  projectColorValue: document.querySelector('#project-color-value'),
  projectColorPresets: document.querySelector('#project-color-presets'),
  projectFormStatus: document.querySelector('#project-form-status'),
  taskProjectDialog: document.querySelector('#task-project-dialog'),
  taskProjectForm: document.querySelector('#task-project-form'),
  taskProjectDialogTitle: document.querySelector('#task-project-dialog-title'),
  taskProjectSelect: document.querySelector('#task-project-dialog-select'),
  taskProjectFormStatus: document.querySelector('#task-project-form-status'),
  removeTaskOrEvent: document.querySelector('#remove-task-or-event'),
  taskList: document.querySelector('#task-list'),
  taskCount: document.querySelector('#task-count'),
  storageTaskCount: document.querySelector('#storage-task-count'),
  storageEventCount: document.querySelector('#storage-event-count'),
  storageOldestEvent: document.querySelector('#storage-oldest-event'),
  storageNewestEvent: document.querySelector('#storage-newest-event'),
  storageEstimatedUsage: document.querySelector('#storage-estimated-usage'),
  manageHistoryButton: document.querySelector('#manage-history-button'),
  historyDialog: document.querySelector('#history-dialog'),
  historyCutoff: document.querySelector('#history-cutoff'),
  historyPreview: document.querySelector('#history-preview'),
  historyConfirmation: document.querySelector('#history-confirmation'),
  historyExportButton: document.querySelector('#history-export-button'),
  confirmHistoryCleanup: document.querySelector('#confirm-history-cleanup'),
  resetDatabaseDialog: document.querySelector('#reset-database-dialog'),
  resetDatabaseButton: document.querySelector('#reset-database-button'),
  confirmResetDatabase: document.querySelector('#confirm-reset-database'),
  importDialog: document.querySelector('#import-dialog'),
  importFile: document.querySelector('#import-file'),
  importFileName: document.querySelector('#import-file-name'),
  fizzyDialog: document.querySelector('#fizzy-dialog'),
  fizzyForm: document.querySelector('#fizzy-form'),
  fizzyToken: document.querySelector('#fizzy-token'),
  fizzyAccountField: document.querySelector('#fizzy-account-field'),
  fizzyAccount: document.querySelector('#fizzy-account'),
  fizzyVerifyButton: document.querySelector('#fizzy-verify-button'),
  fizzySaveButton: document.querySelector('#fizzy-save-button'),
  fizzyDisconnectButton: document.querySelector('#fizzy-disconnect-button'),
  fizzyFormStatus: document.querySelector('#fizzy-form-status'),
  settingsFizzyStatus: document.querySelector('#settings-fizzy-status'),
  fizzySettingsButton: document.querySelector('#fizzy-settings-button'),
  trelloDialog: document.querySelector('#trello-dialog'),
  trelloForm: document.querySelector('#trello-form'),
  trelloApiKey: document.querySelector('#trello-api-key'),
  trelloToken: document.querySelector('#trello-token'),
  trelloAuthorizeButton: document.querySelector('#trello-authorize-button'),
  trelloVerifyButton: document.querySelector('#trello-verify-button'),
  trelloSaveButton: document.querySelector('#trello-save-button'),
  trelloDisconnectButton: document.querySelector('#trello-disconnect-button'),
  trelloFormStatus: document.querySelector('#trello-form-status'),
  trelloSelection: document.querySelector('#trello-selection'),
  trelloBoardList: document.querySelector('#trello-board-list'),
  trelloBoardCount: document.querySelector('#trello-board-count'),
  settingsTrelloStatus: document.querySelector('#settings-trello-status'),
  trelloSettingsButton: document.querySelector('#trello-settings-button'),
  syncAllButton: document.querySelector('#sync-all-button'),
  syncAllIcons: document.querySelector('#sync-all-icons'),
  toastRegion: document.querySelector('#toast-region'),
  narrowWeekends: document.querySelector('#narrow-weekends'),
  hideWeekends: document.querySelector('#hide-weekends')
};

const state = {
  tasks: [],
  projects: [],
  taskQuery: '',
  activeSidebarTab: 'tasks',
  selectedTaskId: null,
  editingProjectId: null,
  editingTaskId: null,
  editingEventId: null,
  calendarEventsRequestId: 0,
  historyPreviewRequestId: 0,
  historyEligibleCount: 0,
  initialized: false,
  suspendCalendarRangeLoading: false,
  report: {
    rows: [],
    mode: 'grouped',
    generated: false
  },
  pendingImportFile: null,
  calendar: null,
  syncingAll: false,
  fizzy: {
    connection: null,
    accounts: [],
    syncing: false
  },
  trello: {
    connection: null,
    setup: null,
    verifiedSignature: '',
    syncing: false
  },
  preferences: {
    locale: detectLocale(),
    view: 'week',
    sidebarHidden: false,
    narrowWeekend: false,
    hideWeekends: false
  }
};

async function applyApplicationLocale(locale, { persist = false } = {}) {
  const normalized = setLocale(locale);
  state.preferences.locale = normalized;
  document.documentElement.lang = normalized;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));

  for (const button of elements.localeButtons) {
    const active = normalizeLocale(button.dataset.locale) === normalized;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.toggleAttribute('aria-current', active);
  }

  localizeTree(app, normalized);
  state.calendar?.setLocale(normalized);
  if (state.calendar) formatRangeTitle();

  if (state.initialized) {
    renderTasks();
    renderProjects();
    renderIntegrationConnections();
    renderProjectColorPresets();
    if (state.report.generated) {
      renderReportRows(state.report.rows, state.report.mode);
    } else {
      clearReportOutput();
    }
    if (elements.historyDialog.open) updateHistoryPreview();
    if (elements.shell.dataset.screen === 'settings') {
      refreshDatabaseStats().catch(console.error);
    }
  }

  if (persist) await setSetting('locale', normalized);
}

function notify(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="ph ${type === 'error' ? 'ph-warning-circle' : 'ph-check-circle'}" aria-hidden="true"></i>
    <span></span>
  `;
  toast.querySelector('span').textContent = translateLiteral(message);
  elements.toastRegion.append(toast);

  window.setTimeout(() => {
    toast.classList.add('toast-leaving');
    window.setTimeout(() => toast.remove(), 180);
  }, 3200);
}

function taskCountLabel(count) {
  return t('task.count', { count });
}

function addLocalDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function dateFromInput(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    !year ||
    !month ||
    !day ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function historyCutoffFromInput() {
  const cutoff = dateFromInput(elements.historyCutoff.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return cutoff && cutoff <= today ? cutoff : null;
}

function monthsAgo(months) {
  const today = new Date();
  const day = today.getDate();
  const target = new Date(today.getFullYear(), today.getMonth() - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  target.setHours(0, 0, 0, 0);
  return target;
}

function formatStoredDate(value) {
  if (!value) return translateLiteral('Sem histórico');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return translateLiteral('Data indisponível');
  return formatDate(date, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatStorageSize(bytes) {
  if (!Number.isFinite(bytes)) return translateLiteral('Não disponível');
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${formatNumber(value, {
    maximumFractionDigits: value < 10 ? 1 : 0
  })} ${unit}`;
}

function normalizeSearch(value) {
  return value
    .trim()
    .toLocaleLowerCase(getLocale())
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function filteredTasks() {
  const query = normalizeSearch(state.taskQuery);
  if (!query) return state.tasks;
  return state.tasks.filter((task) => normalizeSearch(task.title).includes(query));
}

function setTaskFormStatus(message = '', type = '') {
  elements.addTaskStatus.textContent = translateLiteral(message);
  elements.addTaskStatus.dataset.type = type;
}

function setProjectFormStatus(message = '', type = '') {
  elements.projectFormStatus.textContent = translateLiteral(message);
  elements.projectFormStatus.dataset.type = type;
}

function setSidebarTab(tab) {
  state.activeSidebarTab = tab;
  const projectsActive = tab === 'projects';
  elements.tasksTab.classList.toggle('is-active', !projectsActive);
  elements.tasksTab.setAttribute('aria-selected', String(!projectsActive));
  elements.projectsTab.classList.toggle('is-active', projectsActive);
  elements.projectsTab.setAttribute('aria-selected', String(projectsActive));
  elements.tasksPanel.hidden = projectsActive;
  elements.projectsPanel.hidden = !projectsActive;
}

function setProjectColor(color) {
  elements.projectColor.value = color;
  elements.projectColorValue.textContent = color.toUpperCase();
  elements.projectColorPresets
    .querySelectorAll('button')
    .forEach((button) => button.classList.toggle('is-selected', button.dataset.color === color));
}

function renderProjectColorPresets() {
  elements.projectColorPresets.replaceChildren();
  for (const color of PROJECT_COLOR_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-color-preset';
    button.dataset.color = color;
    button.style.backgroundColor = color;
    button.setAttribute('aria-label', t('color.use', { color }));
    button.title = color;
    button.addEventListener('click', () => setProjectColor(color));
    elements.projectColorPresets.append(button);
  }
}

function openProjectDialog(project = null) {
  state.editingProjectId = project?.id ?? null;
  elements.projectDialogTitle.textContent = translateLiteral(
    project ? 'Editar projeto' : 'Novo projeto'
  );
  elements.projectName.value = project?.name || '';
  setProjectColor(project?.color || PROJECT_COLOR_PRESETS[0]);
  setProjectFormStatus();
  elements.projectDialog.showModal();
  elements.projectName.focus();
  elements.projectName.select();
}

function setTaskProjectFormStatus(message = '', type = '') {
  elements.taskProjectFormStatus.textContent = translateLiteral(message);
  elements.taskProjectFormStatus.dataset.type = type;
}

function populateTaskProjectSelect(task) {
  elements.taskProjectSelect.replaceChildren();
  const noProject = document.createElement('option');
  noProject.value = '';
  noProject.textContent = translateLiteral('Sem projeto');
  noProject.selected = task?.projectId == null;
  elements.taskProjectSelect.append(noProject);

  for (const project of state.projects) {
    const option = document.createElement('option');
    option.value = String(project.id);
    option.textContent = project.name;
    option.dataset.i18nSkip = '';
    option.selected = Number(task?.projectId) === Number(project.id);
    elements.taskProjectSelect.append(option);
  }
}

function openTaskProjectDialog(task, { eventId = null, eventTitle = '' } = {}) {
  state.editingTaskId = task?.id ?? null;
  state.editingEventId = eventId;
  const isCalendarEvent = eventId != null;
  elements.taskProjectDialogTitle.textContent =
    task?.title || eventTitle || translateLiteral('Tarefa');
  elements.taskProjectSelect.disabled = !task;
  document.querySelector('#save-task-project').disabled = !task;
  elements.removeTaskOrEvent.disabled = !task && !isCalendarEvent;
  elements.removeTaskOrEvent.querySelector('span').textContent = translateLiteral(
    isCalendarEvent ? 'Remover este bloco' : 'Remover tarefa'
  );
  populateTaskProjectSelect(task);
  setTaskProjectFormStatus(
    task
      ? ''
      : isCalendarEvent
        ? 'A tarefa original não está mais disponível, mas este bloco ainda pode ser removido.'
        : 'A tarefa original não está mais disponível para edição.',
    task ? '' : 'error'
  );
  elements.taskProjectDialog.showModal();
}

function renderProjects() {
  elements.projectList.replaceChildren();

  if (!state.projects.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state project-empty-state';
    empty.innerHTML = `
      <span class="empty-icon"><i class="ph ph-list-bullets" aria-hidden="true"></i></span>
      <h3>Sem projetos ainda</h3>
      <p>Crie um projeto para organizar tarefas e dar cor aos seus blocos.</p>
    `;
    localizeTree(empty);
    elements.projectList.append(empty);
    return;
  }

  for (const project of state.projects) {
    const count = state.tasks.filter((task) => Number(task.projectId) === Number(project.id)).length;
    const row = document.createElement('article');
    row.className = 'project-row';
    row.innerHTML = `
      <span class="project-color-swatch" aria-hidden="true"></span>
      <span class="project-row-copy"><strong></strong><small></small></span>
      <button class="project-edit" type="button" aria-label="Editar projeto" title="Editar projeto"><i class="ph ph-gear-six" aria-hidden="true"></i></button>
      <button class="project-delete" type="button" aria-label="Excluir projeto" title="Excluir projeto"><i class="ph ph-trash" aria-hidden="true"></i></button>
    `;
    row.querySelector('.project-color-swatch').style.backgroundColor = project.color;
    row.querySelector('strong').dataset.i18nSkip = '';
    row.querySelector('strong').textContent = project.name;
    row.querySelector('small').textContent = t('project.taskCount', { count });
    localizeTree(row);
    row.querySelector('.project-edit').addEventListener('click', () => openProjectDialog(project));
    row.querySelector('.project-delete').addEventListener('click', async () => {
      const confirmation = t('project.deleteConfirm', { name: project.name });
      if (!window.confirm(confirmation)) return;

      try {
        const result = await deleteProject(project.id);
        await refreshData();
        notify(
          result.taskCount
            ? 'Projeto excluído. As tarefas relacionadas ficaram sem projeto.'
            : 'Projeto excluído.'
        );
      } catch (error) {
        console.error(error);
        notify(localizedError(error), 'error');
      }
    });
    elements.projectList.append(row);
  }
}

function openAddTaskDialog() {
  elements.addTaskTitle.value = state.taskQuery.trim();
  setTaskFormStatus();
  elements.taskDialog.showModal();
  elements.addTaskTitle.focus();
  elements.addTaskTitle.select();
}

function formatLastSync(value) {
  if (!value) return getLocale() === 'en' ? 'Ready to sync' : 'Pronto para sincronizar';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return getLocale() === 'en' ? 'Ready to sync' : 'Pronto para sincronizar';
  }

  return t('sync.last', { date: formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) });
}

function setFizzyFormStatus(message = '', type = '') {
  elements.fizzyFormStatus.textContent = translateLiteral(message);
  elements.fizzyFormStatus.dataset.type = type;
}

function populateFizzyAccounts(accounts, selectedSlug) {
  elements.fizzyAccount.replaceChildren();

  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.slug;
    option.textContent = account.name;
    option.dataset.i18nSkip = '';
    option.dataset.accountId = account.id;
    option.selected = account.slug === selectedSlug;
    elements.fizzyAccount.append(option);
  }

  elements.fizzyAccountField.hidden = accounts.length === 0;
}

function renderIntegrationConnections() {
  const connections = [
    {
      id: 'fizzy',
      icon: TASK_SOURCES.fizzy.icon,
      connection: state.fizzy.connection,
      syncing: state.fizzy.syncing,
      status: elements.settingsFizzyStatus,
      button: elements.fizzySettingsButton,
      connectionLabel: state.fizzy.connection?.accountName
    },
    {
      id: 'trello',
      icon: TASK_SOURCES.trello.icon,
      connection: state.trello.connection,
      syncing: state.trello.syncing,
      status: elements.settingsTrelloStatus,
      button: elements.trelloSettingsButton,
      connectionLabel: state.trello.connection?.memberName
    }
  ];
  const connected = connections.filter((item) => item.connection);
  const syncing = state.syncingAll || connections.some((item) => item.syncing);

  for (const item of connections) {
    item.button.disabled = item.syncing;
    item.button.textContent = translateLiteral(item.connection ? 'Configurar' : 'Conectar');
    item.status.textContent = item.syncing
      ? translateLiteral('Sincronizando…')
      : item.connection
        ? `${item.connectionLabel} · ${formatLastSync(item.connection.lastSyncedAt)}`
        : translateLiteral('Não conectado');
  }

  elements.syncAllIcons.replaceChildren();
  for (const item of connected) {
    const icon = document.createElement('img');
    icon.src = item.icon;
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    elements.syncAllIcons.append(icon);
  }

  elements.syncAllButton.disabled = connected.length === 0 || syncing;
  elements.syncAllButton.classList.toggle('is-syncing', syncing);
  elements.syncAllButton.setAttribute('aria-busy', String(syncing));
  elements.syncAllButton.title = translateLiteral(
    connected.length
      ? 'Sincronizar aplicativos conectados'
      : 'Conecte um aplicativo nas Configurações'
  );
}

function renderFizzyConnection() {
  renderIntegrationConnections();
}

async function openFizzyDialog() {
  state.fizzy.connection = await getIntegration('fizzy');
  state.fizzy.accounts = [];
  elements.fizzyToken.value = '';
  elements.fizzyToken.placeholder = translateLiteral(
    state.fizzy.connection
      ? 'Token salvo. Preencha apenas para trocar'
      : 'Cole o token gerado no Fizzy'
  );
  elements.fizzyDisconnectButton.hidden = !state.fizzy.connection;
  elements.fizzySaveButton.disabled = !state.fizzy.connection;
  setFizzyFormStatus(
    state.fizzy.connection
      ? t('sync.connectedAccount', { name: state.fizzy.connection.accountName })
      : ''
  );

  if (state.fizzy.connection) {
    state.fizzy.accounts = [
      {
        id: state.fizzy.connection.accountId,
        name: state.fizzy.connection.accountName,
        slug: state.fizzy.connection.accountSlug
      }
    ];
    populateFizzyAccounts(
      state.fizzy.accounts,
      state.fizzy.connection.accountSlug
    );
  } else {
    populateFizzyAccounts([], '');
  }

  elements.fizzyDialog.showModal();
}

async function verifyFizzyToken() {
  const token =
    elements.fizzyToken.value.trim() || state.fizzy.connection?.accessToken || '';

  elements.fizzyVerifyButton.disabled = true;
  elements.fizzySaveButton.disabled = true;
  setFizzyFormStatus(
    getLocale() === 'en'
      ? 'Checking the token and loading accounts...'
      : 'Verificando o token e buscando contas...'
  );

  try {
    const accounts = await fetchFizzyAccounts(token);
    state.fizzy.accounts = accounts;
    const preferredSlug = accounts.some(
      (account) => account.slug === state.fizzy.connection?.accountSlug
    )
      ? state.fizzy.connection.accountSlug
      : accounts[0].slug;

    populateFizzyAccounts(accounts, preferredSlug);
    elements.fizzySaveButton.disabled = false;
    setFizzyFormStatus(
      accounts.length === 1
        ? t('sync.fizzyAccounts.one')
        : t('sync.fizzyAccounts.many', { count: accounts.length }),
      'success'
    );
  } catch (error) {
    state.fizzy.accounts = [];
    populateFizzyAccounts([], '');
    console.error(error);
    setFizzyFormStatus(localizedError(error), 'error');
  } finally {
    elements.fizzyVerifyButton.disabled = false;
  }
}

function syncSummary(result) {
  const parts = [];
  const english = getLocale() === 'en';
  if (result.added) {
    parts.push(`${result.added} ${english ? `added` : `adicionada${result.added === 1 ? '' : 's'}`}`);
  }
  if (result.updated) {
    parts.push(`${result.updated} ${english ? `updated` : `atualizada${result.updated === 1 ? '' : 's'}`}`);
  }
  if (result.removed) {
    parts.push(`${result.removed} ${english ? `removed` : `removida${result.removed === 1 ? '' : 's'}`}`);
  }
  return parts.length ? parts.join(', ') : (english ? 'No changes' : 'Nenhuma mudança');
}

async function syncFizzy({ announce = true, refresh = true } = {}) {
  const connection = state.fizzy.connection || (await getIntegration('fizzy'));

  if (!connection) {
    await openFizzyDialog();
    return { source: 'fizzy', skipped: true };
  }

  state.fizzy.connection = connection;
  state.fizzy.syncing = true;
  renderFizzyConnection();

  try {
    const cards = await fetchOpenFizzyCards(connection);
    const result = await syncExternalTasks('fizzy', cards);
    state.fizzy.connection = await saveIntegration({
      ...connection,
      lastSyncedAt: new Date().toISOString()
    });
    if (refresh) await refreshData();
    if (announce) {
      notify(
        getLocale() === 'en'
          ? `Fizzy synced. ${syncSummary(result)}.`
          : `Fizzy sincronizado. ${syncSummary(result)}.`
      );
    }
    return { source: 'fizzy', result };
  } catch (error) {
    if (announce) notify(localizedError(error), 'error');
    return { source: 'fizzy', error };
  } finally {
    state.fizzy.syncing = false;
    renderFizzyConnection();
  }
}

function setTrelloFormStatus(message = '', type = '') {
  elements.trelloFormStatus.textContent = translateLiteral(message);
  elements.trelloFormStatus.dataset.type = type;
}

function trelloCredentials() {
  return {
    apiKey:
      elements.trelloApiKey.value.trim() ||
      state.trello.connection?.apiKey ||
      '',
    accessToken:
      elements.trelloToken.value.trim() ||
      state.trello.connection?.accessToken ||
      ''
  };
}

function trelloCredentialSignature() {
  const { apiKey, accessToken } = trelloCredentials();
  return `${apiKey}\u0000${accessToken}`;
}

function looksLikeDoneList(name) {
  const normalized = normalizeSearch(name);
  return [
    'done',
    'concluido',
    'concluidos',
    'concluida',
    'concluidas',
    'feito',
    'feitos',
    'finalizado',
    'finalizados'
  ].includes(normalized);
}

function updateTrelloSelectionState() {
  const boardInputs = Array.from(
    elements.trelloBoardList.querySelectorAll('[data-trello-board]')
  );
  const selectedCount = boardInputs.filter((input) => input.checked).length;

  for (const boardInput of boardInputs) {
    const boardOption = boardInput.closest('.trello-board-option');
    const listInputs = boardOption.querySelectorAll('[data-trello-done-list]');
    boardOption.classList.toggle('is-selected', boardInput.checked);
    for (const listInput of listInputs) listInput.disabled = !boardInput.checked;
  }

  elements.trelloBoardCount.textContent = getLocale() === 'en'
    ? `${selectedCount} of ${boardInputs.length} ${boardInputs.length === 1 ? 'board' : 'boards'}`
    : boardInputs.length === 1
      ? `${selectedCount} de 1 quadro`
      : `${selectedCount} de ${boardInputs.length} quadros`;
  elements.trelloSaveButton.disabled =
    !state.trello.setup ||
    selectedCount === 0 ||
    trelloCredentialSignature() !== state.trello.verifiedSignature;
}

function renderTrelloBoards() {
  const boards = state.trello.setup?.boards || [];
  const selectedBoardIds = new Set(
    Array.isArray(state.trello.connection?.boardIds)
      ? state.trello.connection.boardIds.map(String)
      : boards.length === 1
        ? [String(boards[0].id)]
        : []
  );
  const selectedDoneListIds = new Set(
    Array.isArray(state.trello.connection?.doneListIds)
      ? state.trello.connection.doneListIds.map(String)
      : []
  );
  const suggestDoneLists = !state.trello.connection;

  elements.trelloBoardList.replaceChildren();
  elements.trelloSelection.hidden = boards.length === 0;

  for (const board of boards) {
    const option = document.createElement('article');
    option.className = 'trello-board-option';
    option.innerHTML = `
      <label class="trello-checkbox trello-board-checkbox">
        <input type="checkbox" data-trello-board />
        <span>
          <strong></strong>
          <small></small>
        </span>
      </label>
      <div class="trello-list-section">
        <p>Não importar cards destas listas</p>
        <div class="trello-list-options"></div>
      </div>
    `;

    const boardInput = option.querySelector('[data-trello-board]');
    boardInput.value = String(board.id);
    boardInput.checked = selectedBoardIds.has(String(board.id));
    option.querySelector('.trello-board-checkbox strong').dataset.i18nSkip = '';
    option.querySelector('.trello-board-checkbox strong').textContent = board.name;
    option.querySelector('.trello-board-checkbox small').textContent = getLocale() === 'en'
      ? `${board.lists.length} open ${board.lists.length === 1 ? 'list' : 'lists'}`
      : board.lists.length === 1
        ? '1 lista aberta'
        : `${board.lists.length} listas abertas`;

    const listOptions = option.querySelector('.trello-list-options');
    for (const list of board.lists) {
      const listLabel = document.createElement('label');
      listLabel.className = 'trello-checkbox trello-list-checkbox';
      listLabel.innerHTML = `
        <input type="checkbox" data-trello-done-list />
        <span></span>
      `;
      const listInput = listLabel.querySelector('input');
      listInput.value = String(list.id);
      listInput.dataset.boardId = String(board.id);
      listInput.checked =
        selectedDoneListIds.has(String(list.id)) ||
        (suggestDoneLists && looksLikeDoneList(list.name));
      listLabel.querySelector('span').dataset.i18nSkip = '';
      listLabel.querySelector('span').textContent = list.name;
      listOptions.append(listLabel);
    }

    boardInput.addEventListener('change', updateTrelloSelectionState);
    localizeTree(option);
    elements.trelloBoardList.append(option);
  }

  updateTrelloSelectionState();
}

function selectedTrelloConfiguration() {
  const boardIds = Array.from(
    elements.trelloBoardList.querySelectorAll('[data-trello-board]:checked'),
    (input) => String(input.value)
  );
  const selectedBoards = new Set(boardIds);
  const doneListIds = Array.from(
    elements.trelloBoardList.querySelectorAll('[data-trello-done-list]:checked'),
    (input) => input
  )
    .filter((input) => selectedBoards.has(String(input.dataset.boardId)))
    .map((input) => String(input.value));

  return { boardIds, doneListIds };
}

function renderTrelloConnection() {
  renderIntegrationConnections();
}

async function openTrelloDialog() {
  state.trello.connection = await getIntegration('trello');
  elements.trelloApiKey.value = '';
  elements.trelloToken.value = '';
  elements.trelloApiKey.placeholder = state.trello.connection
    ? (getLocale() === 'en' ? 'API Key saved. Fill this in only to replace it' : 'API Key salva. Preencha apenas para trocar')
    : translateLiteral('Cole sua API Key');
  elements.trelloToken.placeholder = state.trello.connection
    ? (getLocale() === 'en' ? 'Token saved. Fill this in only to replace it' : 'Token salvo. Preencha apenas para trocar')
    : translateLiteral('Cole o token de leitura');
  elements.trelloDisconnectButton.hidden = !state.trello.connection;
  setTrelloFormStatus(
    state.trello.connection
      ? t('sync.connectedAs', { name: state.trello.connection.memberName })
      : ''
  );

  state.trello.setup =
    state.trello.connection?.memberId &&
    Array.isArray(state.trello.connection?.boards)
      ? {
          member: {
            id: state.trello.connection.memberId,
            name: state.trello.connection.memberName,
            username: state.trello.connection.memberUsername || ''
          },
          boards: state.trello.connection.boards
        }
      : null;
  state.trello.verifiedSignature = state.trello.connection
    ? `${state.trello.connection.apiKey}\u0000${state.trello.connection.accessToken}`
    : '';

  renderTrelloBoards();
  elements.trelloDialog.showModal();
}

async function verifyTrelloAccess() {
  const { apiKey, accessToken } = trelloCredentials();
  elements.trelloVerifyButton.disabled = true;
  elements.trelloSaveButton.disabled = true;
  setTrelloFormStatus(
    getLocale() === 'en'
      ? 'Checking access and loading your boards...'
      : 'Verificando o acesso e buscando seus quadros...'
  );

  try {
    state.trello.setup = await fetchTrelloSetup(apiKey, accessToken);
    state.trello.verifiedSignature = `${apiKey}\u0000${accessToken}`;
    renderTrelloBoards();
    setTrelloFormStatus(
      getLocale() === 'en'
        ? `Access verified. ${state.trello.setup.boards.length} open ${
            state.trello.setup.boards.length === 1 ? 'board' : 'boards'
          } found.`
        : state.trello.setup.boards.length === 1
          ? 'Acesso válido. Um quadro aberto encontrado.'
          : `Acesso válido. ${state.trello.setup.boards.length} quadros abertos encontrados.`,
      'success'
    );
  } catch (error) {
    state.trello.setup = null;
    state.trello.verifiedSignature = '';
    renderTrelloBoards();
    console.error(error);
    setTrelloFormStatus(localizedError(error), 'error');
  } finally {
    elements.trelloVerifyButton.disabled = false;
  }
}

function openTrelloAuthorization() {
  try {
    const url = trelloAuthorizationUrl(trelloCredentials().apiKey);
    const authorizationWindow = window.open(url, '_blank');
    if (!authorizationWindow) {
      throw appError('error.trello.popupBlocked');
    }
    authorizationWindow.opener = null;
    setTrelloFormStatus(
      getLocale() === 'en'
        ? 'Authorize access in Trello and paste the generated token here.'
        : 'Autorize o acesso no Trello e cole o token gerado aqui.'
    );
  } catch (error) {
    console.error(error);
    setTrelloFormStatus(localizedError(error), 'error');
  }
}

async function syncTrello({ announce = true, refresh = true } = {}) {
  const connection = state.trello.connection || (await getIntegration('trello'));

  if (!connection) {
    await openTrelloDialog();
    return { source: 'trello', skipped: true };
  }

  state.trello.connection = connection;
  state.trello.syncing = true;
  renderTrelloConnection();

  try {
    const cards = await fetchOpenTrelloCards(connection);
    const result = await syncExternalTasks('trello', cards);
    state.trello.connection = await saveIntegration({
      ...connection,
      lastSyncedAt: new Date().toISOString()
    });
    if (refresh) await refreshData();
    if (announce) {
      notify(
        getLocale() === 'en'
          ? `Trello synced. ${syncSummary(result)}.`
          : `Trello sincronizado. ${syncSummary(result)}.`
      );
    }
    return { source: 'trello', result };
  } catch (error) {
    if (announce) notify(localizedError(error), 'error');
    return { source: 'trello', error };
  } finally {
    state.trello.syncing = false;
    renderTrelloConnection();
  }
}

async function syncAllConnections() {
  const connectedSources = [
    state.fizzy.connection ? 'fizzy' : null,
    state.trello.connection ? 'trello' : null
  ].filter(Boolean);
  if (!connectedSources.length || state.syncingAll) return;

  state.syncingAll = true;
  renderIntegrationConnections();

  try {
    const outcomes = [];
    if (state.fizzy.connection) {
      outcomes.push(await syncFizzy({ announce: false, refresh: false }));
    }
    if (state.trello.connection) {
      outcomes.push(await syncTrello({ announce: false, refresh: false }));
    }

    if (outcomes.some((outcome) => outcome.result)) {
      await refreshData();
    }

    const failures = outcomes.filter((outcome) => outcome.error);
    if (failures.length) {
      const labels = failures.map((outcome) => TASK_SOURCES[outcome.source].label);
      notify(
        getLocale() === 'en'
          ? `Could not sync: ${labels.join(' and ')}.`
          : `Não foi possível sincronizar: ${labels.join(' e ')}.`,
        'error'
      );
      return;
    }

    const totals = outcomes.reduce(
      (summary, outcome) => ({
        added: summary.added + (outcome.result?.added || 0),
        updated: summary.updated + (outcome.result?.updated || 0),
        removed: summary.removed + (outcome.result?.removed || 0)
      }),
      { added: 0, updated: 0, removed: 0 }
    );
    notify(
      getLocale() === 'en'
        ? `Sync complete. ${syncSummary(totals)}.`
        : `Sync concluído. ${syncSummary(totals)}.`
    );
  } catch (error) {
    console.error(error);
    notify(localizedError(error), 'error');
  } finally {
    state.syncingAll = false;
    renderIntegrationConnections();
  }
}

function renderTasks() {
  const visibleTasks = filteredTasks();
  elements.taskList.replaceChildren();
  elements.taskCount.textContent = state.taskQuery.trim() && state.tasks.length
    ? `${visibleTasks.length} ${getLocale() === 'en' ? 'of' : 'de'} ${taskCountLabel(state.tasks.length)}`
    : taskCountLabel(state.tasks.length);

  if (!state.tasks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span class="empty-icon"><i class="ph ph-check-square-offset" aria-hidden="true"></i></span>
      <h3>Sua lista está livre</h3>
      <p>Use o botão “+” para adicionar sua primeira tarefa.</p>
    `;
    localizeTree(empty);
    elements.taskList.append(empty);
    return;
  }

  if (!visibleTasks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span class="empty-icon"><i class="ph ph-magnifying-glass" aria-hidden="true"></i></span>
      <h3>Nenhuma tarefa encontrada</h3>
      <p>Tente buscar por outro termo.</p>
    `;
    localizeTree(empty);
    elements.taskList.append(empty);
    return;
  }

  for (const task of visibleTasks) {
    const source = TASK_SOURCES[task.source];
    const project = state.projects.find((item) => Number(item.id) === Number(task.projectId));
    const colors = taskColorsForProject(project);
    const row = document.createElement('article');
    row.className = 'task-row';
    row.draggable = true;
    row.dataset.taskId = String(task.id);
    row.style.setProperty('--task-card-background', colors.backgroundColor);
    row.style.setProperty('--task-card-border', colors.borderColor);
    row.innerHTML = `
      <button class="drag-handle" type="button" aria-label="Arrastar tarefa" title="Arraste para o calendário" tabindex="-1">
        <i class="ph ph-dots-six-vertical" aria-hidden="true"></i>
      </button>
      <div class="task-content">
        <div class="task-content-copy">
          <span class="task-title-line">
            ${
              source
                ? `<img class="task-source-icon" src="${source.icon}" alt="" aria-hidden="true" title="${source.label}" /><span class="sr-only">${source.label}: </span>`
                : ''
            }
            <span class="task-title" data-i18n-skip></span>
          </span>
        </div>
      </div>
      <button class="task-delete" type="button" aria-label="Excluir tarefa" title="Excluir tarefa">
        <i class="ph ph-trash" aria-hidden="true"></i>
      </button>
    `;
    row.querySelector('.task-title').textContent = task.title;
    localizeTree(row);
    row.querySelector('.task-content').addEventListener('click', () => openTaskProjectDialog(task));
    row.querySelector('.task-delete').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await removeTaskFromList(task);
        notify(
          getLocale() === 'en'
            ? 'Task removed. History was preserved.'
            : 'Tarefa removida. O histórico foi preservado.'
        );
      } catch (error) {
        button.disabled = false;
        console.error(error);
        notify(localizedError(error), 'error');
      }
    });
    row.addEventListener('dragstart', (event) => {
      state.selectedTaskId = task.id;
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-rics-time-blocking-task', String(task.id));
      event.dataTransfer.setData('text/plain', task.title);
      row.classList.add('is-dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('is-dragging');
      hideDropPreview();
    });
    elements.taskList.append(row);
  }
}

function hideDropPreview() {
  elements.dropPreview.classList.remove('is-visible');
}

function updateDropPreview(event) {
  const task = state.tasks.find((item) => Number(item.id) === Number(state.selectedTaskId));
  const target = state.calendar.getDropTarget(
    event.clientX,
    event.clientY,
    DEFAULT_BLOCK_DURATION_MINUTES
  );

  if (!task || !target.previewRect) {
    hideDropPreview();
    return target;
  }

  const { left, top, width, height } = target.previewRect;
  elements.dropPreviewTitle.textContent = task.title;
  elements.dropPreview.style.left = `${left}px`;
  elements.dropPreview.style.top = `${top}px`;
  elements.dropPreview.style.width = `${width}px`;
  elements.dropPreview.style.height = `${height}px`;
  elements.dropPreview.classList.add('is-visible');
  return target;
}

async function createTaskBlock(taskId, { start, end }) {
  const task = await getTask(Number(taskId));

  if (!task) throw appError('error.task.missing');

  const blockStart = new Date(start);
  const blockEnd = new Date(end);

  if (
    !Number.isFinite(blockStart.getTime()) ||
    !Number.isFinite(blockEnd.getTime()) ||
    blockEnd <= blockStart
  ) {
    throw appError('error.block.invalidPeriod');
  }

  const record = await addEvent({
    taskId: task.id,
    projectId: task.projectId,
    title: task.title,
    source: task.source,
    start: blockStart,
    end: blockEnd,
    isAllDay: false,
    calendarId: 'work'
  });

  state.selectedTaskId = task.id;
  const project = state.projects.find((item) => Number(item.id) === Number(task.projectId));
  state.calendar.addEvent({ ...record, ...eventColorsForProject(project) });
  return record;
}

async function removeTaskFromList(task) {
  const deletedEvents = await deleteTaskAndFutureEvents(task);
  for (const event of deletedEvents) state.calendar.removeEvent(event);
  state.tasks = state.tasks.filter((item) => Number(item.id) !== Number(task.id));
  renderTasks();
}

async function removeEventFromCalendar(eventId) {
  await deleteEvent(eventId);
  state.calendar.removeEvent({ id: eventId });
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

async function refreshDatabaseStats() {
  const [stats, storageEstimate] = await Promise.all([
    getDatabaseStats(),
    navigator.storage?.estimate?.().catch(() => null) ?? null
  ]);
  elements.storageTaskCount.textContent = formatNumber(stats.taskCount);
  elements.storageEventCount.textContent = formatNumber(stats.eventCount);
  elements.storageOldestEvent.textContent = formatStoredDate(stats.oldestEventStart);
  elements.storageNewestEvent.textContent = formatStoredDate(stats.newestEventEnd);
  elements.storageEstimatedUsage.textContent = formatStorageSize(storageEstimate?.usage);
  elements.manageHistoryButton.disabled = stats.eventCount === 0;
}

function updateHistoryCleanupButton() {
  elements.confirmHistoryCleanup.disabled =
    state.historyEligibleCount === 0 || !elements.historyConfirmation.checked;
}

async function updateHistoryPreview() {
  const requestId = ++state.historyPreviewRequestId;
  const cutoff = historyCutoffFromInput();
  state.historyEligibleCount = 0;
  elements.historyConfirmation.checked = false;
  updateHistoryCleanupButton();

  if (!cutoff) {
    elements.historyPreview.textContent = translateLiteral(
      'Escolha hoje ou uma data anterior para calcular a prévia.'
    );
    elements.historyPreview.dataset.type = 'error';
    return;
  }

  elements.historyPreview.textContent = translateLiteral('Calculando blocos elegíveis…');
  elements.historyPreview.dataset.type = '';

  try {
    const count = await countHistoricalEvents(cutoff);
    if (requestId !== state.historyPreviewRequestId) return;
    state.historyEligibleCount = count;
    elements.historyPreview.textContent = count
      ? t('history.previewCount', { count })
      : translateLiteral('Nenhum bloco será excluído com esta data.');
    elements.historyPreview.dataset.type = count ? 'warning' : '';
    updateHistoryCleanupButton();
  } catch (error) {
    if (requestId !== state.historyPreviewRequestId) return;
    console.error(error);
    elements.historyPreview.textContent = localizedError(error);
    elements.historyPreview.dataset.type = 'error';
  }
}

function openHistoryDialog() {
  const today = new Date();
  elements.historyCutoff.max = dateInputValue(today);
  elements.historyCutoff.value = dateInputValue(monthsAgo(24));
  state.historyEligibleCount = 0;
  elements.historyConfirmation.checked = false;
  elements.historyDialog.showModal();
  updateHistoryPreview();
}

function formatRangeTitle() {
  if (!state.calendar) return;

  const { start, end } = state.calendar.getRange();
  const displayEnd = new Date(end);
  const sameDay = start.toDateString() === displayEnd.toDateString();
  const monthYear = new Intl.DateTimeFormat(getLocale(), {
    month: 'long',
    year: 'numeric'
  });
  const day = new Intl.DateTimeFormat(getLocale(), { day: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat(getLocale(), {
    day: 'numeric',
    month: 'long'
  });

  if (state.preferences.view === 'month') {
    const current = state.calendar.instance.getDate();
    elements.rangeTitle.textContent = monthYear.format(
      typeof current.toDate === 'function' ? current.toDate() : new Date(current)
    );
    return;
  }

  if (sameDay) {
    elements.rangeTitle.textContent = new Intl.DateTimeFormat(getLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(start);
    return;
  }

  const sameMonth =
    start.getMonth() === displayEnd.getMonth() && start.getFullYear() === displayEnd.getFullYear();
  elements.rangeTitle.textContent = sameMonth
    ? t('range.join', { start: day.format(start), end: dayMonth.format(displayEnd) })
    : t('range.join', { start: dayMonth.format(start), end: dayMonth.format(displayEnd) });
}

async function loadPreferences() {
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const [locale, view, sidebarHidden, narrowWeekend, hideWeekends] = await Promise.all([
    getSetting('locale', detectLocale()),
    getSetting('view', isMobile ? 'day' : 'week'),
    getSetting('sidebarHidden', isMobile),
    getSetting('narrowWeekend', false),
    getSetting('hideWeekends', false)
  ]);

  state.preferences = {
    locale: normalizeLocale(locale),
    view,
    sidebarHidden,
    narrowWeekend,
    hideWeekends
  };
}

function applyPreferences() {
  state.suspendCalendarRangeLoading = true;
  applyApplicationLocale(state.preferences.locale);
  elements.viewSelect.value = state.preferences.view;
  elements.shell.dataset.view = state.preferences.view;
  elements.narrowWeekends.setAttribute('aria-pressed', String(state.preferences.narrowWeekend));
  elements.hideWeekends.setAttribute('aria-pressed', String(state.preferences.hideWeekends));
  elements.shell.dataset.sidebar = state.preferences.sidebarHidden ? 'hidden' : 'visible';
  state.calendar.setWeekendOptions({
    narrowWeekend: state.preferences.narrowWeekend,
    hideWeekends: state.preferences.hideWeekends
  });
  state.calendar.setView(state.preferences.view);
  state.suspendCalendarRangeLoading = false;
  window.requestAnimationFrame(() => state.calendar.render());
}

function decorateCalendarEvents(events) {
  const taskById = new Map(state.tasks.map((task) => [Number(task.id), task]));
  const projectById = new Map(state.projects.map((project) => [Number(project.id), project]));
  return events.map((event) => ({
    ...event,
    source: event.source || taskById.get(Number(event.taskId))?.source,
    ...eventColorsForProject(
      projectById.get(Number(event.projectId ?? taskById.get(Number(event.taskId))?.projectId))
    )
  }));
}

async function refreshCalendarEvents() {
  if (!state.calendar) return;
  const requestId = ++state.calendarEventsRequestId;
  const { start, end } = state.calendar.getRange();
  const queryStart = addLocalDays(start, -CALENDAR_RANGE_MARGIN_DAYS);
  const queryEnd = addLocalDays(end, CALENDAR_RANGE_MARGIN_DAYS);
  const events = await listEventsInRange(queryStart, queryEnd);
  if (requestId !== state.calendarEventsRequestId) return;
  await state.calendar.replaceEvents(decorateCalendarEvents(events));
}

function handleCalendarRangeChange() {
  formatRangeTitle();
  if (!state.initialized || state.suspendCalendarRangeLoading) return;
  refreshCalendarEvents().catch((error) => {
    console.error(error);
    notify(
      getLocale() === 'en'
        ? 'This period could not be loaded.'
        : 'Não foi possível carregar este período.',
      'error'
    );
  });
}

async function refreshData() {
  [state.tasks, state.projects] = await Promise.all([listTasks(), listProjects()]);
  if (!state.tasks.some((task) => Number(task.id) === Number(state.selectedTaskId))) {
    state.selectedTaskId = state.tasks[0]?.id ?? null;
  }
  renderTasks();
  renderProjects();
  await refreshCalendarEvents();
  formatRangeTitle();
}

async function setSidebarHidden(hidden) {
  state.preferences.sidebarHidden = hidden;
  elements.shell.dataset.sidebar = hidden ? 'hidden' : 'visible';
  await setSetting('sidebarHidden', hidden);
  window.setTimeout(() => state.calendar.render(), 220);
}

async function setWeekendPreference(key, value) {
  state.preferences[key] = value;
  await setSetting(key, value);
  elements.narrowWeekends.setAttribute('aria-pressed', String(state.preferences.narrowWeekend));
  elements.hideWeekends.setAttribute('aria-pressed', String(state.preferences.hideWeekends));
  state.calendar.setWeekendOptions({
    narrowWeekend: state.preferences.narrowWeekend,
    hideWeekends: state.preferences.hideWeekends
  });
}

function selectedReportProjectIds() {
  return Array.from(
    elements.reportProjectOptions.querySelectorAll('input[type="checkbox"]:checked'),
    (input) => input.value
  );
}

function setReportFormStatus(message = '', type = '') {
  elements.reportFormStatus.textContent = translateLiteral(message);
  elements.reportFormStatus.dataset.type = type;
}

function clearReportOutput() {
  state.report = { rows: [], mode: 'grouped', generated: false };
  elements.reportExportButton.disabled = true;
  elements.reportExportPdfButton.disabled = true;
  elements.reportResultsSummary.textContent = translateLiteral(
    'Defina os parâmetros para gerar um relatório.'
  );
  elements.reportResultsContent.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'report-empty-state';
  empty.innerHTML = `
    <i class="ph ph-hard-drives" aria-hidden="true"></i>
    <h3>Nenhum relatório gerado</h3>
    <p>Os resultados aparecerão aqui e só existem enquanto esta tela estiver aberta.</p>
  `;
  localizeTree(empty);
  elements.reportResultsContent.append(empty);
}

function renderReportProjectOptions() {
  elements.reportProjectOptions.replaceChildren();
  const options = [
    { id: REPORT_UNASSIGNED_PROJECT, name: translateLiteral('Sem projeto'), color: '#A0A0A0' },
    ...state.projects.map((project) => ({ id: String(project.id), name: project.name, color: project.color }))
  ];

  for (const option of options) {
    const label = document.createElement('label');
    label.className = 'report-project-option';
    label.innerHTML = `
      <input type="checkbox" />
      <span class="report-project-color" aria-hidden="true"></span>
      <span></span>
    `;
    const input = label.querySelector('input');
    input.value = option.id;
    input.addEventListener('change', () => {
      clearReportOutput();
      updateReportFormState();
    });
    label.querySelector('.report-project-color').style.backgroundColor = option.color;
    if (option.id !== REPORT_UNASSIGNED_PROJECT) {
      label.querySelector('span:last-child').dataset.i18nSkip = '';
    }
    label.querySelector('span:last-child').textContent = option.name;
    elements.reportProjectOptions.append(label);
  }
}

function reportMode() {
  return document.querySelector('input[name="report-mode"]:checked')?.value || 'grouped';
}

function updateReportFormState() {
  const start = elements.reportStartDate.value;
  const end = elements.reportEndDate.value;
  const hasProjects = selectedReportProjectIds().length > 0;
  const validRange = Boolean(start && end && start <= end);
  elements.reportGenerateButton.disabled = !validRange || !hasProjects;

  if (end && start && end < start) {
    setReportFormStatus('A data final deve ser igual ou posterior à data inicial.', 'error');
  } else if (start && end && !hasProjects) {
    setReportFormStatus('Escolha ao menos um projeto.', 'error');
  } else {
    setReportFormStatus();
  }
}

function renderReportRows(rows, mode) {
  elements.reportResultsContent.replaceChildren();
  const totalHours = rows.reduce((total, row) => total + row.hours, 0);
  elements.reportResultsSummary.textContent = rows.length
    ? t('report.summary', {
        rows: rows.length,
        hours: formatHours(totalHours, getLocale())
      })
    : translateLiteral('Nenhum bloco encontrado para os filtros escolhidos.');
  elements.reportExportButton.disabled = rows.length === 0;
  elements.reportExportPdfButton.disabled = rows.length === 0;

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'report-empty-state';
    empty.innerHTML = `
      <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
      <h3>Sem resultados neste período</h3>
      <p>Tente ajustar o intervalo ou os projetos selecionados.</p>
    `;
    localizeTree(empty);
    elements.reportResultsContent.append(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'report-table';
  const headings = mode === 'detailed'
    ? ['Tarefa', 'Data', 'Início', 'Fim', 'Horas']
    : ['Tarefa', 'Total de horas'];
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  headings.forEach((heading) => {
    const cell = document.createElement('th');
    cell.textContent = translateLiteral(heading);
    headRow.append(cell);
  });
  head.append(headRow);
  const body = document.createElement('tbody');

  for (const row of rows) {
    const tableRow = document.createElement('tr');
    const values = mode === 'detailed'
      ? [
          row.taskTitle,
          formatDate(dateFromInput(row.date)),
          row.start,
          row.end,
          formatHours(row.hours, getLocale())
        ]
      : [row.taskTitle, formatHours(row.hours, getLocale())];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (value === row.taskTitle) cell.dataset.i18nSkip = '';
      tableRow.append(cell);
    });
    body.append(tableRow);
  }

  table.append(head, body);
  elements.reportResultsContent.append(table);
}

function resetReportScreen() {
  elements.reportStartDate.value = '';
  elements.reportEndDate.value = '';
  renderReportProjectOptions();
  clearReportOutput();
  updateReportFormState();
}

function setActiveScreen(screen) {
  const planning = screen === 'planning';
  const reports = screen === 'reports';
  const settings = screen === 'settings';
  elements.shell.dataset.screen = screen;
  elements.reportsScreen.hidden = !reports;
  elements.settingsScreen.hidden = !settings;
  elements.planningNavigation.classList.toggle('is-active', planning);
  elements.planningNavigation.toggleAttribute('aria-current', planning);
  elements.reportsNavigation.classList.toggle('is-active', reports);
  elements.reportsNavigation.toggleAttribute('aria-current', reports);
  elements.settingsNavigation.classList.toggle('is-active', settings);
  elements.settingsNavigation.toggleAttribute('aria-current', settings);

  if (reports) {
    elements.reportsScreen.scrollTop = 0;
    resetReportScreen();
  } else if (settings) {
    elements.settingsScreen.scrollTop = 0;
    renderIntegrationConnections();
    refreshDatabaseStats().catch((error) => {
      console.error(error);
      notify(
        getLocale() === 'en'
          ? 'Data usage could not be calculated.'
          : 'Não foi possível calcular o uso de dados.',
        'error'
      );
    });
  } else {
    clearReportOutput();
    window.requestAnimationFrame(() => state.calendar?.render());
  }
}

async function generateCurrentReport() {
  const mode = reportMode();
  const rangeStart = dateFromInput(elements.reportStartDate.value);
  const inclusiveEnd = dateFromInput(elements.reportEndDate.value);
  if (!rangeStart || !inclusiveEnd) throw appError('error.range.invalid');
  const events = await listEventsInRange(rangeStart, addLocalDays(inclusiveEnd, 1));
  const rows = generateReport({
    events,
    tasks: state.tasks,
    selectedProjectIds: selectedReportProjectIds(),
    startDate: elements.reportStartDate.value,
    endDate: elements.reportEndDate.value,
    mode,
    locale: getLocale()
  });

  state.report = {
    rows,
    mode,
    generated: true,
    startDate: elements.reportStartDate.value,
    endDate: elements.reportEndDate.value
  };
  renderReportRows(rows, mode);
}

function reportFileName(extension) {
  const type = t(`report.fileMode.${state.report.mode}`);
  return `rics-time-blocking-${t('report.fileStem')}-${type}-${state.report.startDate}-${getLocale() === 'en' ? 'to' : 'a'}-${state.report.endDate}.${extension}`;
}

function downloadReportFile(blob, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = reportFileName(extension);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCurrentReportCsv() {
  if (!state.report.generated || !state.report.rows.length) return;
  const blob = new Blob([reportCsv({ ...state.report, locale: getLocale() })], {
    type: 'text/csv;charset=utf-8'
  });
  downloadReportFile(blob, 'csv');
}

async function exportCurrentReportPdf() {
  if (!state.report.generated || !state.report.rows.length) return;
  const button = elements.reportExportPdfButton;
  const label = button.querySelector('span');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  label.textContent = translateLiteral('Gerando PDF…');

  try {
    const blob = await reportPdf({ ...state.report, locale: getLocale() });
    downloadReportFile(blob, 'pdf');
    notify(getLocale() === 'en' ? 'PDF exported successfully.' : 'PDF exportado com sucesso.');
  } catch (error) {
    console.error(error);
    notify(getLocale() === 'en' ? 'The PDF could not be exported.' : 'Não foi possível exportar o PDF.', 'error');
  } finally {
    button.removeAttribute('aria-busy');
    button.disabled = !state.report.rows.length;
    label.textContent = translateLiteral('Exportar PDF');
  }
}

function wireEvents() {
  elements.planningNavigation.addEventListener('click', () => setActiveScreen('planning'));
  elements.reportsNavigation.addEventListener('click', () => setActiveScreen('reports'));
  elements.settingsNavigation.addEventListener('click', () => setActiveScreen('settings'));
  elements.localeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyApplicationLocale(button.dataset.locale, { persist: true }).catch((error) => {
        console.error(error);
        notify(localizedError(error), 'error');
      });
    });
  });

  [elements.reportStartDate, elements.reportEndDate].forEach((input) => {
    input.addEventListener('change', () => {
      clearReportOutput();
      updateReportFormState();
    });
  });

  document.querySelectorAll('input[name="report-mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      clearReportOutput();
      updateReportFormState();
    });
  });

  elements.reportForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (elements.reportGenerateButton.disabled) return;
    try {
      await generateCurrentReport();
    } catch (error) {
      console.error(error);
      setReportFormStatus(localizedError(error), 'error');
    }
  });
  elements.reportExportButton.addEventListener('click', exportCurrentReportCsv);
  elements.reportExportPdfButton.addEventListener('click', exportCurrentReportPdf);

  document.querySelector('#previous-range').addEventListener('click', () => state.calendar.move(-1));
  document.querySelector('#next-range').addEventListener('click', () => state.calendar.move(1));
  document.querySelector('#today-button').addEventListener('click', () => state.calendar.today());

  elements.viewSelect.addEventListener('change', async (event) => {
    state.preferences.view = event.target.value;
    elements.shell.dataset.view = state.preferences.view;
    await setSetting('view', state.preferences.view);
    state.calendar.setView(state.preferences.view);
    formatRangeTitle();
  });

  elements.narrowWeekends.addEventListener('click', () =>
    setWeekendPreference('narrowWeekend', !state.preferences.narrowWeekend)
  );
  elements.hideWeekends.addEventListener('click', () =>
    setWeekendPreference('hideWeekends', !state.preferences.hideWeekends)
  );

  elements.fizzySettingsButton.addEventListener('click', () => openFizzyDialog());
  elements.fizzyVerifyButton.addEventListener('click', () => verifyFizzyToken());

  elements.fizzyToken.addEventListener('input', () => {
    if (elements.fizzyToken.value.trim()) {
      elements.fizzySaveButton.disabled = true;
      setFizzyFormStatus(
        getLocale() === 'en'
          ? 'Verify the new token before saving.'
          : 'Verifique o novo token antes de salvar.'
      );
    } else if (state.fizzy.connection) {
      elements.fizzySaveButton.disabled = false;
      setFizzyFormStatus(
        t('sync.connectedAccount', { name: state.fizzy.connection.accountName })
      );
    }
  });

  elements.fizzyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedOption = elements.fizzyAccount.selectedOptions[0];
    const selectedAccount = state.fizzy.accounts.find(
      (account) => account.slug === selectedOption?.value
    );
    const accessToken =
      elements.fizzyToken.value.trim() || state.fizzy.connection?.accessToken || '';

    if (!selectedAccount || !accessToken) {
      setFizzyFormStatus(
        getLocale() === 'en'
          ? 'Verify the token and choose an account.'
          : 'Verifique o token e escolha uma conta.',
        'error'
      );
      return;
    }

    try {
      const previousConnection = state.fizzy.connection;
      state.fizzy.connection = await saveIntegration({
        id: 'fizzy',
        accessToken,
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
        accountSlug: selectedAccount.slug,
        lastSyncedAt:
          previousConnection?.accountId === selectedAccount.id
            ? previousConnection.lastSyncedAt
            : null
      });
      closeDialog(elements.fizzyDialog);
      renderFizzyConnection();
      await syncFizzy();
    } catch (error) {
      console.error(error);
      setFizzyFormStatus(localizedError(error), 'error');
    }
  });

  elements.fizzyDisconnectButton.addEventListener('click', async () => {
    await deleteIntegration('fizzy');
    state.fizzy.connection = null;
    state.fizzy.accounts = [];
    closeDialog(elements.fizzyDialog);
    renderFizzyConnection();
    notify(
      getLocale() === 'en'
        ? 'Fizzy disconnected. Previously imported tasks were kept.'
        : 'Fizzy desconectado. As tarefas já importadas foram mantidas.'
    );
  });

  elements.trelloSettingsButton.addEventListener('click', () => openTrelloDialog());
  elements.trelloAuthorizeButton.addEventListener('click', openTrelloAuthorization);
  elements.trelloVerifyButton.addEventListener('click', () => verifyTrelloAccess());

  const handleTrelloCredentialInput = () => {
    updateTrelloSelectionState();
    if (trelloCredentialSignature() !== state.trello.verifiedSignature) {
      setTrelloFormStatus(
        getLocale() === 'en'
          ? 'Verify the new API Key and token before saving.'
          : 'Verifique a nova API Key e o token antes de salvar.'
      );
    } else if (state.trello.connection) {
      setTrelloFormStatus(t('sync.connectedAs', { name: state.trello.connection.memberName }));
    }
  };

  elements.trelloApiKey.addEventListener('input', handleTrelloCredentialInput);
  elements.trelloToken.addEventListener('input', handleTrelloCredentialInput);

  elements.trelloForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.trello.setup || elements.trelloSaveButton.disabled) {
      setTrelloFormStatus(
        getLocale() === 'en'
          ? 'Verify access and choose at least one board.'
          : 'Verifique o acesso e escolha ao menos um quadro.',
        'error'
      );
      return;
    }

    const { boardIds, doneListIds } = selectedTrelloConfiguration();
    const { apiKey, accessToken } = trelloCredentials();

    if (!boardIds.length) {
      setTrelloFormStatus(localizedError(appError('error.trello.boardRequired')), 'error');
      return;
    }

    try {
      const previousConnection = state.trello.connection;
      state.trello.connection = await saveIntegration({
        id: 'trello',
        apiKey,
        accessToken,
        memberId: state.trello.setup.member.id,
        memberName: state.trello.setup.member.name,
        memberUsername: state.trello.setup.member.username,
        boardIds,
        doneListIds,
        boards: state.trello.setup.boards,
        lastSyncedAt:
          previousConnection?.memberId === state.trello.setup.member.id
            ? previousConnection.lastSyncedAt
            : null
      });
      closeDialog(elements.trelloDialog);
      renderTrelloConnection();
      await syncTrello();
    } catch (error) {
      console.error(error);
      setTrelloFormStatus(localizedError(error), 'error');
    }
  });

  elements.trelloDisconnectButton.addEventListener('click', async () => {
    await deleteIntegration('trello');
    state.trello.connection = null;
    state.trello.setup = null;
    state.trello.verifiedSignature = '';
    closeDialog(elements.trelloDialog);
    renderTrelloConnection();
    notify(
      getLocale() === 'en'
        ? 'Trello disconnected. Previously imported tasks were kept.'
        : 'Trello desconectado. As tarefas já importadas foram mantidas.'
    );
  });

  elements.syncAllButton.addEventListener('click', () => syncAllConnections());

  document.querySelector('#sidebar-toggle').addEventListener('click', () => setSidebarHidden(true));
  document.querySelector('#sidebar-restore').addEventListener('click', () => setSidebarHidden(false));
  document.querySelector('#sidebar-scrim').addEventListener('click', () => setSidebarHidden(true));

  elements.taskSearch.addEventListener('input', (event) => {
    state.taskQuery = event.target.value;
    renderTasks();
  });

  elements.tasksTab.addEventListener('click', () => setSidebarTab('tasks'));
  elements.projectsTab.addEventListener('click', () => setSidebarTab('projects'));
  elements.addTaskButton.addEventListener('click', openAddTaskDialog);
  elements.addProjectButton.addEventListener('click', () => openProjectDialog());

  elements.projectColor.addEventListener('input', () => setProjectColor(elements.projectColor.value));

  elements.projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = {
      name: elements.projectName.value,
      color: elements.projectColor.value
    };

    try {
      if (state.editingProjectId == null) {
        await addProject(values.name, values.color);
        notify(getLocale() === 'en' ? 'Project created.' : 'Projeto criado.');
      } else {
        await updateProject(state.editingProjectId, values);
        notify(getLocale() === 'en' ? 'Project updated.' : 'Projeto atualizado.');
      }
      closeDialog(elements.projectDialog);
      await refreshData();
    } catch (error) {
      console.error(error);
      setProjectFormStatus(localizedError(error), 'error');
      elements.projectName.focus();
    }
  });

  elements.taskProjectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.editingTaskId == null) return;

    try {
      await updateTaskProject(state.editingTaskId, elements.taskProjectSelect.value || null);
      closeDialog(elements.taskProjectDialog);
      await refreshData();
      notify(getLocale() === 'en' ? 'Task project updated.' : 'Projeto da tarefa atualizado.');
    } catch (error) {
      console.error(error);
      setTaskProjectFormStatus(localizedError(error), 'error');
    }
  });

  elements.removeTaskOrEvent.addEventListener('click', async () => {
    const task = state.tasks.find(
      (item) => Number(item.id) === Number(state.editingTaskId)
    );
    const eventId = state.editingEventId;

    if (!task && eventId == null) {
      setTaskProjectFormStatus(
        'A tarefa original não está mais disponível para remoção.',
        'error'
      );
      return;
    }

    elements.removeTaskOrEvent.disabled = true;
    try {
      if (eventId != null) {
        await removeEventFromCalendar(eventId);
        closeDialog(elements.taskProjectDialog);
        notify(getLocale() === 'en' ? 'Block removed.' : 'Bloco removido.');
      } else {
        await removeTaskFromList(task);
        closeDialog(elements.taskProjectDialog);
        notify(
          getLocale() === 'en'
            ? 'Task removed. History was preserved.'
            : 'Tarefa removida. O histórico foi preservado.'
        );
      }
    } catch (error) {
      elements.removeTaskOrEvent.disabled = false;
      console.error(error);
      setTaskProjectFormStatus(localizedError(error), 'error');
    }
  });

  elements.addTaskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveMode = event.submitter?.dataset.saveMode || 'continue';

    try {
      const task = await addTask(elements.addTaskTitle.value);
      state.tasks.push(task);
      state.selectedTaskId = task.id;
      renderTasks();

      if (saveMode === 'continue') {
        elements.addTaskTitle.value = '';
        setTaskFormStatus(
          getLocale() === 'en'
            ? 'Task added. Enter the next one.'
            : 'Tarefa adicionada. Digite a próxima.',
          'success'
        );
        elements.addTaskTitle.focus();
      } else {
        closeDialog(elements.taskDialog);
        notify(getLocale() === 'en' ? 'Task added.' : 'Tarefa adicionada.');
      }
    } catch (error) {
      console.error(error);
      setTaskFormStatus(localizedError(error), 'error');
      elements.addTaskTitle.focus();
      elements.addTaskTitle.select();
    }
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  document.querySelector('#export-button').addEventListener('click', async () => {
    try {
      await exportBackup();
      notify('Backup exportado.');
    } catch (error) {
      console.error(error);
      notify(localizedError(error), 'error');
    }
  });

  elements.manageHistoryButton.addEventListener('click', openHistoryDialog);

  document.querySelectorAll('[data-history-months]').forEach((button) => {
    button.addEventListener('click', () => {
      elements.historyCutoff.value = dateInputValue(monthsAgo(Number(button.dataset.historyMonths)));
      updateHistoryPreview();
    });
  });

  elements.historyCutoff.addEventListener('change', updateHistoryPreview);
  elements.historyConfirmation.addEventListener('change', updateHistoryCleanupButton);

  elements.historyExportButton.addEventListener('click', async () => {
    try {
      await exportBackup();
      notify('Backup exportado.');
    } catch (error) {
      console.error(error);
      notify(localizedError(error), 'error');
    }
  });

  elements.confirmHistoryCleanup.addEventListener('click', async () => {
    const cutoff = historyCutoffFromInput();
    if (!cutoff || elements.confirmHistoryCleanup.disabled) return;

    elements.confirmHistoryCleanup.disabled = true;
    elements.confirmHistoryCleanup.setAttribute('aria-busy', 'true');
    elements.confirmHistoryCleanup.textContent = translateLiteral('Excluindo…');
    try {
      const deletedCount = await deleteHistoricalEvents(cutoff);
      state.historyEligibleCount = 0;
      closeDialog(elements.historyDialog);
      clearReportOutput();
      await Promise.all([refreshData(), refreshDatabaseStats()]);
      notify(
        t('history.deleteCount', { count: deletedCount })
      );
    } catch (error) {
      console.error(error);
      elements.historyPreview.textContent = localizedError(error);
      elements.historyPreview.dataset.type = 'error';
    } finally {
      elements.confirmHistoryCleanup.removeAttribute('aria-busy');
      elements.confirmHistoryCleanup.textContent = translateLiteral('Excluir histórico');
      updateHistoryCleanupButton();
    }
  });

  document.querySelector('#import-button').addEventListener('click', () => {
    elements.importFile.click();
  });

  elements.resetDatabaseButton.addEventListener('click', () => {
    elements.resetDatabaseDialog.showModal();
  });

  elements.confirmResetDatabase.addEventListener('click', async () => {
    elements.confirmResetDatabase.disabled = true;
    elements.confirmResetDatabase.textContent = translateLiteral('Apagando…');
    try {
      await resetDatabase();
      window.location.reload();
    } catch (error) {
      elements.confirmResetDatabase.disabled = false;
      elements.confirmResetDatabase.textContent = translateLiteral('Sim, apagar tudo');
      console.error(error);
      notify(localizedError(error), 'error');
    }
  });

  elements.importFile.addEventListener('change', () => {
    const [file] = elements.importFile.files;
    if (!file) return;
    state.pendingImportFile = file;
    elements.importFileName.textContent = file.name;
    elements.importDialog.showModal();
  });

  document.querySelectorAll('[data-import-mode]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state.pendingImportFile) return;
      try {
        const result = await importBackup(state.pendingImportFile, button.dataset.importMode);
        closeDialog(elements.importDialog);
        elements.importFile.value = '';
        state.pendingImportFile = null;
        await loadPreferences();
        await applyApplicationLocale(state.preferences.locale);
        applyPreferences();
        await refreshData();
        await refreshDatabaseStats();
        notify(t('import.summary', { tasks: result.taskCount, events: result.eventCount }));
      } catch (error) {
        console.error(error);
        notify(localizedError(error), 'error');
      }
    });
  });

  elements.calendarPane.addEventListener('dragover', (event) => {
    if (!event.dataTransfer.types.includes('application/x-rics-time-blocking-task')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    updateDropPreview(event);
  });

  elements.calendarPane.addEventListener('dragleave', (event) => {
    if (!elements.calendarPane.contains(event.relatedTarget)) {
      hideDropPreview();
    }
  });

  elements.calendarPane.addEventListener('drop', async (event) => {
    const taskId = Number(
      event.dataTransfer.getData('application/x-rics-time-blocking-task')
    );
    if (!taskId) return;
    event.preventDefault();
    const target = updateDropPreview(event);
    hideDropPreview();

    try {
      const start = target.start;
      await createTaskBlock(taskId, {
        start,
        end: new Date(start.getTime() + DEFAULT_BLOCK_DURATION_MINUTES * 60_000)
      });
      notify(
        getLocale() === 'en'
          ? '30-minute block added. Drag its edge to adjust it.'
          : 'Bloco de 30 minutos adicionado. Arraste a borda para ajustar.'
      );
    } catch (error) {
      console.error(error);
      notify(localizedError(error), 'error');
    }
  });

  const observer = new ResizeObserver(() => state.calendar?.render());
  observer.observe(elements.calendarPane);
}

async function init() {
  await prepareDatabase();
  await Promise.all([
    loadPreferences(),
    getIntegration('fizzy').then((connection) => {
      state.fizzy.connection = connection || null;
    }),
    getIntegration('trello').then((connection) => {
      state.trello.connection = connection || null;
    })
  ]);
  await applyApplicationLocale(state.preferences.locale);

  state.calendar = createCalendar(elements.calendar, {
    locale: state.preferences.locale,
    onRequestCreate() {
      state.calendar.clearSelection();
    },
    async onRequestEventDetails(event) {
      const task = Number.isFinite(event.taskId) ? await getTask(event.taskId) : null;
      openTaskProjectDialog(task, {
        eventId: event.id,
        eventTitle: event.title
      });
    },
    async onUpdate(id, changes) {
      await updateEvent(id, changes);
      notify(getLocale() === 'en' ? 'Block updated.' : 'Bloco atualizado.');
    },
    async onDelete(id) {
      await deleteEvent(id);
      notify(getLocale() === 'en' ? 'Block removed.' : 'Bloco removido.');
    },
    onRangeChange: handleCalendarRangeChange,
    async onViewChange(view) {
      state.preferences.view = view;
      elements.shell.dataset.view = view;
      elements.viewSelect.value = view;
      await setSetting('view', view);
    },
    onError(error) {
      console.error(error);
      notify(localizedError(error), 'error');
      refreshData();
    }
  });

  applyPreferences();
  renderProjectColorPresets();
  wireEvents();
  renderFizzyConnection();
  renderTrelloConnection();
  await refreshData();
  state.initialized = true;

  registerSW({
    onOfflineReady() {
      notify(
        getLocale() === 'en'
          ? 'Rics Time-blocking is ready for offline use.'
          : 'O Rics Time-blocking está pronto para uso offline.'
      );
    },
    onRegisterError() {
      notify(
        getLocale() === 'en'
          ? 'Offline mode could not be enabled.'
          : 'Não foi possível ativar o modo offline.',
        'error'
      );
    }
  });
}

init().catch((error) => {
  app.innerHTML = `
    <main class="fatal-error">
      <i class="ph ph-warning-circle" aria-hidden="true"></i>
      <h1>Não foi possível abrir o Rics Time-blocking</h1>
      <p></p>
      <button type="button" onclick="window.location.reload()">Tentar novamente</button>
    </main>
  `;
  console.error(error);
  app.querySelector('.fatal-error p').textContent = localizedError(error);
  localizeTree(app);
});
