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
  countFutureEventsForTask,
  deleteEvent,
  deleteIntegration,
  deleteProject,
  deleteTaskAndFutureEvents,
  getIntegration,
  getSetting,
  getTask,
  listEvents,
  listProjects,
  listTasks,
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

const DEFAULT_BLOCK_DURATION_MINUTES = 30;
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
      <div class="brand" aria-label="Rics Time-blocking">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span>Rics Time-blocking</span>
      </div>

      <nav class="app-navigation" aria-label="Navegação principal">
        <button class="app-navigation-link is-active" id="planning-navigation" type="button" aria-current="page">Planejamento</button>
        <button class="app-navigation-link" id="reports-navigation" type="button">Relatórios</button>
      </nav>
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

        <details class="more-menu">
          <summary class="icon-button" aria-label="Backup e importação" title="Backup e importação">
            <i class="ph ph-dots-three-outline" aria-hidden="true"></i>
          </summary>
          <div class="menu-popover">
            <button id="export-button" type="button">
              <i class="ph ph-download-simple" aria-hidden="true"></i>
              Exportar backup
            </button>
            <button id="import-button" type="button">
              <i class="ph ph-upload-simple" aria-hidden="true"></i>
              Importar backup
            </button>
          </div>
        </details>
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
          <div class="integration-row">
            <button class="integration-sync-button" id="fizzy-sync-button" type="button">
              <img src="/fizzy.png" alt="" aria-hidden="true" />
              <span class="integration-sync-copy">
                <strong id="fizzy-sync-label">Conectar ao Fizzy</strong>
                <span id="fizzy-sync-status">Importe seus cards em aberto</span>
              </span>
              <i class="ph ph-arrow-clockwise" aria-hidden="true"></i>
            </button>
            <button class="integration-settings-button" id="fizzy-settings-button" type="button" aria-label="Configurar Fizzy" title="Configurar Fizzy" hidden>
              <i class="ph ph-gear-six" aria-hidden="true"></i>
            </button>
          </div>

          <div class="integration-row">
            <button class="integration-sync-button" id="trello-sync-button" type="button">
              <img src="/trello.svg" alt="" aria-hidden="true" />
              <span class="integration-sync-copy">
                <strong id="trello-sync-label">Conectar ao Trello</strong>
                <span id="trello-sync-status">Importe cards dos seus quadros</span>
              </span>
              <i class="ph ph-arrow-clockwise" aria-hidden="true"></i>
            </button>
            <button class="integration-settings-button" id="trello-settings-button" type="button" aria-label="Configurar Trello" title="Configurar Trello" hidden>
              <i class="ph ph-gear-six" aria-hidden="true"></i>
            </button>
          </div>
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
          <h2 id="task-project-dialog-title"></h2>
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
      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
        <button class="primary-button" id="save-task-project" type="submit">Salvar</button>
      </div>
    </form>
  </dialog>

  <dialog id="delete-dialog" class="app-dialog compact-dialog">
    <div class="dialog-heading">
      <div>
        <p class="dialog-kicker">Excluir tarefa</p>
        <h2 id="delete-title">Confirmar exclusão</h2>
      </div>
    </div>
    <p id="delete-description" class="dialog-copy"></p>
    <p id="delete-source-note" class="source-delete-note" hidden></p>
    <p class="history-note">
      <i class="ph ph-clock-counter-clockwise" aria-hidden="true"></i>
      Blocos que já começaram serão mantidos como histórico.
    </p>
    <div class="dialog-actions">
      <button class="secondary-button" type="button" data-close-dialog>Cancelar</button>
      <button class="danger-button" id="confirm-delete" type="button">Excluir tarefa</button>
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
    <p id="import-file-name" class="dialog-copy"></p>
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
  reportsScreen: document.querySelector('#reports-screen'),
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
  taskList: document.querySelector('#task-list'),
  taskCount: document.querySelector('#task-count'),
  deleteDialog: document.querySelector('#delete-dialog'),
  deleteTitle: document.querySelector('#delete-title'),
  deleteDescription: document.querySelector('#delete-description'),
  deleteSourceNote: document.querySelector('#delete-source-note'),
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
  fizzySyncButton: document.querySelector('#fizzy-sync-button'),
  fizzySyncLabel: document.querySelector('#fizzy-sync-label'),
  fizzySyncStatus: document.querySelector('#fizzy-sync-status'),
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
  trelloSyncButton: document.querySelector('#trello-sync-button'),
  trelloSyncLabel: document.querySelector('#trello-sync-label'),
  trelloSyncStatus: document.querySelector('#trello-sync-status'),
  trelloSettingsButton: document.querySelector('#trello-settings-button'),
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
  report: {
    rows: [],
    mode: 'grouped',
    generated: false
  },
  pendingDeleteTask: null,
  pendingImportFile: null,
  calendar: null,
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
    view: 'week',
    sidebarHidden: false,
    narrowWeekend: false,
    hideWeekends: false
  }
};

function notify(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="ph ${type === 'error' ? 'ph-warning-circle' : 'ph-check-circle'}" aria-hidden="true"></i>
    <span></span>
  `;
  toast.querySelector('span').textContent = message;
  elements.toastRegion.append(toast);

  window.setTimeout(() => {
    toast.classList.add('toast-leaving');
    window.setTimeout(() => toast.remove(), 180);
  }, 3200);
}

function taskCountLabel(count) {
  return count === 1 ? '1 tarefa' : `${count} tarefas`;
}

function normalizeSearch(value) {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function filteredTasks() {
  const query = normalizeSearch(state.taskQuery);
  if (!query) return state.tasks;
  return state.tasks.filter((task) => normalizeSearch(task.title).includes(query));
}

function setTaskFormStatus(message = '', type = '') {
  elements.addTaskStatus.textContent = message;
  elements.addTaskStatus.dataset.type = type;
}

function setProjectFormStatus(message = '', type = '') {
  elements.projectFormStatus.textContent = message;
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
    button.setAttribute('aria-label', `Usar a cor ${color}`);
    button.title = color;
    button.addEventListener('click', () => setProjectColor(color));
    elements.projectColorPresets.append(button);
  }
}

function openProjectDialog(project = null) {
  state.editingProjectId = project?.id ?? null;
  elements.projectDialogTitle.textContent = project ? 'Editar projeto' : 'Novo projeto';
  elements.projectName.value = project?.name || '';
  setProjectColor(project?.color || PROJECT_COLOR_PRESETS[0]);
  setProjectFormStatus();
  elements.projectDialog.showModal();
  elements.projectName.focus();
  elements.projectName.select();
}

function setTaskProjectFormStatus(message = '', type = '') {
  elements.taskProjectFormStatus.textContent = message;
  elements.taskProjectFormStatus.dataset.type = type;
}

function populateTaskProjectSelect(task) {
  elements.taskProjectSelect.replaceChildren();
  const noProject = document.createElement('option');
  noProject.value = '';
  noProject.textContent = 'Sem projeto';
  noProject.selected = task?.projectId == null;
  elements.taskProjectSelect.append(noProject);

  for (const project of state.projects) {
    const option = document.createElement('option');
    option.value = String(project.id);
    option.textContent = project.name;
    option.selected = Number(task?.projectId) === Number(project.id);
    elements.taskProjectSelect.append(option);
  }
}

function openTaskProjectDialog(task) {
  state.editingTaskId = task?.id ?? null;
  elements.taskProjectDialogTitle.textContent = task?.title || 'Tarefa';
  elements.taskProjectSelect.disabled = !task;
  document.querySelector('#save-task-project').disabled = !task;
  populateTaskProjectSelect(task);
  setTaskProjectFormStatus(
    task ? '' : 'A tarefa original não está mais disponível para edição.',
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
    row.querySelector('strong').textContent = project.name;
    row.querySelector('small').textContent = count === 1 ? '1 tarefa' : `${count} tarefas`;
    row.querySelector('.project-edit').addEventListener('click', () => openProjectDialog(project));
    row.querySelector('.project-delete').addEventListener('click', async () => {
      const confirmation = `Excluir o projeto “${project.name}”? As tarefas ficarão sem projeto.`;
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
        notify(error.message, 'error');
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
  if (!value) return 'Pronto para sincronizar';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Pronto para sincronizar';

  return `Sincronizado em ${new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)}`;
}

function setFizzyFormStatus(message = '', type = '') {
  elements.fizzyFormStatus.textContent = message;
  elements.fizzyFormStatus.dataset.type = type;
}

function populateFizzyAccounts(accounts, selectedSlug) {
  elements.fizzyAccount.replaceChildren();

  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.slug;
    option.textContent = account.name;
    option.dataset.accountId = account.id;
    option.selected = account.slug === selectedSlug;
    elements.fizzyAccount.append(option);
  }

  elements.fizzyAccountField.hidden = accounts.length === 0;
}

function renderFizzyConnection() {
  const { connection, syncing } = state.fizzy;
  elements.fizzySyncButton.disabled = syncing;
  elements.fizzySyncButton.classList.toggle('is-syncing', syncing);
  elements.fizzySettingsButton.hidden = !connection;

  if (syncing) {
    elements.fizzySyncLabel.textContent = 'Sincronizando Fizzy';
    elements.fizzySyncStatus.textContent = 'Buscando cards em aberto';
    return;
  }

  if (!connection) {
    elements.fizzySyncLabel.textContent = 'Conectar ao Fizzy';
    elements.fizzySyncStatus.textContent = 'Importe seus cards em aberto';
    return;
  }

  elements.fizzySyncLabel.textContent = 'Sincronizar Fizzy';
  elements.fizzySyncStatus.textContent = formatLastSync(connection.lastSyncedAt);
}

async function openFizzyDialog() {
  state.fizzy.connection = await getIntegration('fizzy');
  state.fizzy.accounts = [];
  elements.fizzyToken.value = '';
  elements.fizzyToken.placeholder = state.fizzy.connection
    ? 'Token salvo. Preencha apenas para trocar'
    : 'Cole o token gerado no Fizzy';
  elements.fizzyDisconnectButton.hidden = !state.fizzy.connection;
  elements.fizzySaveButton.disabled = !state.fizzy.connection;
  setFizzyFormStatus(
    state.fizzy.connection
      ? `Conectado à conta ${state.fizzy.connection.accountName}.`
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
  setFizzyFormStatus('Verificando o token e buscando contas...');

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
        ? 'Token válido. Uma conta encontrada.'
        : `Token válido. ${accounts.length} contas encontradas.`,
      'success'
    );
  } catch (error) {
    state.fizzy.accounts = [];
    populateFizzyAccounts([], '');
    setFizzyFormStatus(error.message, 'error');
  } finally {
    elements.fizzyVerifyButton.disabled = false;
  }
}

function syncSummary(result) {
  const parts = [];
  if (result.added) parts.push(`${result.added} adicionada${result.added === 1 ? '' : 's'}`);
  if (result.updated) parts.push(`${result.updated} atualizada${result.updated === 1 ? '' : 's'}`);
  if (result.removed) parts.push(`${result.removed} removida${result.removed === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : 'Nenhuma mudança';
}

async function syncFizzy() {
  const connection = state.fizzy.connection || (await getIntegration('fizzy'));

  if (!connection) {
    await openFizzyDialog();
    return;
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
    await refreshData();
    notify(`Fizzy sincronizado. ${syncSummary(result)}.`);
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    state.fizzy.syncing = false;
    renderFizzyConnection();
  }
}

function setTrelloFormStatus(message = '', type = '') {
  elements.trelloFormStatus.textContent = message;
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

  elements.trelloBoardCount.textContent =
    boardInputs.length === 1
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
    option.querySelector('.trello-board-checkbox strong').textContent = board.name;
    option.querySelector('.trello-board-checkbox small').textContent =
      board.lists.length === 1 ? '1 lista aberta' : `${board.lists.length} listas abertas`;

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
      listLabel.querySelector('span').textContent = list.name;
      listOptions.append(listLabel);
    }

    boardInput.addEventListener('change', updateTrelloSelectionState);
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
  const { connection, syncing } = state.trello;
  elements.trelloSyncButton.disabled = syncing;
  elements.trelloSyncButton.classList.toggle('is-syncing', syncing);
  elements.trelloSettingsButton.hidden = !connection;

  if (syncing) {
    elements.trelloSyncLabel.textContent = 'Sincronizando Trello';
    elements.trelloSyncStatus.textContent = 'Buscando cards em aberto';
    return;
  }

  if (!connection) {
    elements.trelloSyncLabel.textContent = 'Conectar ao Trello';
    elements.trelloSyncStatus.textContent = 'Importe cards dos seus quadros';
    return;
  }

  elements.trelloSyncLabel.textContent = 'Sincronizar Trello';
  elements.trelloSyncStatus.textContent = formatLastSync(connection.lastSyncedAt);
}

async function openTrelloDialog() {
  state.trello.connection = await getIntegration('trello');
  elements.trelloApiKey.value = '';
  elements.trelloToken.value = '';
  elements.trelloApiKey.placeholder = state.trello.connection
    ? 'API Key salva. Preencha apenas para trocar'
    : 'Cole sua API Key';
  elements.trelloToken.placeholder = state.trello.connection
    ? 'Token salvo. Preencha apenas para trocar'
    : 'Cole o token de leitura';
  elements.trelloDisconnectButton.hidden = !state.trello.connection;
  setTrelloFormStatus(
    state.trello.connection
      ? `Conectado como ${state.trello.connection.memberName}.`
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
  setTrelloFormStatus('Verificando o acesso e buscando seus quadros...');

  try {
    state.trello.setup = await fetchTrelloSetup(apiKey, accessToken);
    state.trello.verifiedSignature = `${apiKey}\u0000${accessToken}`;
    renderTrelloBoards();
    setTrelloFormStatus(
      state.trello.setup.boards.length === 1
        ? 'Acesso válido. Um quadro aberto encontrado.'
        : `Acesso válido. ${state.trello.setup.boards.length} quadros abertos encontrados.`,
      'success'
    );
  } catch (error) {
    state.trello.setup = null;
    state.trello.verifiedSignature = '';
    renderTrelloBoards();
    setTrelloFormStatus(error.message, 'error');
  } finally {
    elements.trelloVerifyButton.disabled = false;
  }
}

function openTrelloAuthorization() {
  try {
    const url = trelloAuthorizationUrl(trelloCredentials().apiKey);
    const authorizationWindow = window.open(url, '_blank');
    if (!authorizationWindow) {
      throw new Error('O navegador bloqueou a janela de autorização do Trello.');
    }
    authorizationWindow.opener = null;
    setTrelloFormStatus('Autorize o acesso no Trello e cole o token gerado aqui.');
  } catch (error) {
    setTrelloFormStatus(error.message, 'error');
  }
}

async function syncTrello() {
  const connection = state.trello.connection || (await getIntegration('trello'));

  if (!connection) {
    await openTrelloDialog();
    return;
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
    await refreshData();
    notify(`Trello sincronizado. ${syncSummary(result)}.`);
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    state.trello.syncing = false;
    renderTrelloConnection();
  }
}

function renderTasks() {
  const visibleTasks = filteredTasks();
  elements.taskList.replaceChildren();
  elements.taskCount.textContent = state.taskQuery.trim() && state.tasks.length
    ? `${visibleTasks.length} de ${taskCountLabel(state.tasks.length)}`
    : taskCountLabel(state.tasks.length);

  if (!state.tasks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span class="empty-icon"><i class="ph ph-check-square-offset" aria-hidden="true"></i></span>
      <h3>Sua lista está livre</h3>
      <p>Use o botão “+” para adicionar sua primeira tarefa.</p>
    `;
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
            <span class="task-title"></span>
          </span>
        </div>
      </div>
      <button class="task-delete" type="button" aria-label="Excluir tarefa" title="Excluir tarefa">
        <i class="ph ph-trash" aria-hidden="true"></i>
      </button>
    `;
    row.querySelector('.task-title').textContent = task.title;
    row.querySelector('.task-content').addEventListener('click', () => openTaskProjectDialog(task));
    row.querySelector('.task-delete').addEventListener('click', () => openDeleteDialog(task));
    row.addEventListener('dragstart', (event) => {
      state.selectedTaskId = task.id;
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-bloco-task', String(task.id));
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

  if (!task) throw new Error('A tarefa selecionada não existe mais.');

  const blockStart = new Date(start);
  const blockEnd = new Date(end);

  if (
    !Number.isFinite(blockStart.getTime()) ||
    !Number.isFinite(blockEnd.getTime()) ||
    blockEnd <= blockStart
  ) {
    throw new Error('Não foi possível determinar um período válido para o bloco.');
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

async function openDeleteDialog(task) {
  const futureCount = await countFutureEventsForTask(task);
  const source = TASK_SOURCES[task.source];
  state.pendingDeleteTask = task;
  elements.deleteTitle.textContent = task.title;
  elements.deleteDescription.textContent =
    futureCount === 0
      ? 'A tarefa será removida da lista. Não há blocos futuros relacionados.'
      : futureCount === 1
        ? 'A tarefa e 1 bloco futuro relacionado serão removidos.'
        : `A tarefa e ${futureCount} blocos futuros relacionados serão removidos.`;
  elements.deleteSourceNote.hidden = !source;
  elements.deleteSourceNote.textContent = source
    ? `Se o card continuar em aberto e dentro do escopo do ${source.label}, ele voltará na próxima sincronização.`
    : '';
  elements.deleteDialog.showModal();
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function formatRangeTitle() {
  if (!state.calendar) return;

  const { start, end } = state.calendar.getRange();
  const displayEnd = new Date(end);
  const sameDay = start.toDateString() === displayEnd.toDateString();
  const monthYear = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat('pt-BR', {
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
    elements.rangeTitle.textContent = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(start);
    return;
  }

  const sameMonth =
    start.getMonth() === displayEnd.getMonth() && start.getFullYear() === displayEnd.getFullYear();
  elements.rangeTitle.textContent = sameMonth
    ? `${day.format(start)} a ${dayMonth.format(displayEnd)}`
    : `${dayMonth.format(start)} a ${dayMonth.format(displayEnd)}`;
}

async function loadPreferences() {
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const [view, sidebarHidden, narrowWeekend, hideWeekends] = await Promise.all([
    getSetting('view', isMobile ? 'day' : 'week'),
    getSetting('sidebarHidden', isMobile),
    getSetting('narrowWeekend', false),
    getSetting('hideWeekends', false)
  ]);

  state.preferences = { view, sidebarHidden, narrowWeekend, hideWeekends };
}

function applyPreferences() {
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
  window.requestAnimationFrame(() => state.calendar.render());
}

async function refreshData() {
  [state.tasks, state.projects] = await Promise.all([listTasks(), listProjects()]);
  const events = await listEvents();
  const taskById = new Map(state.tasks.map((task) => [Number(task.id), task]));
  const projectById = new Map(state.projects.map((project) => [Number(project.id), project]));
  const calendarEvents = events.map((event) => ({
    ...event,
    source: event.source || taskById.get(Number(event.taskId))?.source,
    ...eventColorsForProject(
      projectById.get(Number(event.projectId ?? taskById.get(Number(event.taskId))?.projectId))
    )
  }));
  if (!state.tasks.some((task) => Number(task.id) === Number(state.selectedTaskId))) {
    state.selectedTaskId = state.tasks[0]?.id ?? null;
  }
  renderTasks();
  renderProjects();
  await state.calendar.replaceEvents(calendarEvents);
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
  elements.reportFormStatus.textContent = message;
  elements.reportFormStatus.dataset.type = type;
}

function clearReportOutput() {
  state.report = { rows: [], mode: 'grouped', generated: false };
  elements.reportExportButton.disabled = true;
  elements.reportExportPdfButton.disabled = true;
  elements.reportResultsSummary.textContent = 'Defina os parâmetros para gerar um relatório.';
  elements.reportResultsContent.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'report-empty-state';
  empty.innerHTML = `
    <i class="ph ph-hard-drives" aria-hidden="true"></i>
    <h3>Nenhum relatório gerado</h3>
    <p>Os resultados aparecerão aqui e só existem enquanto esta tela estiver aberta.</p>
  `;
  elements.reportResultsContent.append(empty);
}

function renderReportProjectOptions() {
  elements.reportProjectOptions.replaceChildren();
  const options = [
    { id: REPORT_UNASSIGNED_PROJECT, name: 'Sem projeto', color: '#A0A0A0' },
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
    ? `${rows.length} ${rows.length === 1 ? 'linha' : 'linhas'} · ${formatHours(totalHours)}`
    : 'Nenhum bloco encontrado para os filtros escolhidos.';
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
    cell.textContent = heading;
    headRow.append(cell);
  });
  head.append(headRow);
  const body = document.createElement('tbody');

  for (const row of rows) {
    const tableRow = document.createElement('tr');
    const values = mode === 'detailed'
      ? [row.taskTitle, row.date.split('-').reverse().join('/'), row.start, row.end, formatHours(row.hours)]
      : [row.taskTitle, formatHours(row.hours)];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
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
  const reports = screen === 'reports';
  elements.shell.dataset.screen = screen;
  elements.reportsScreen.hidden = !reports;
  elements.planningNavigation.classList.toggle('is-active', !reports);
  elements.planningNavigation.toggleAttribute('aria-current', !reports);
  elements.reportsNavigation.classList.toggle('is-active', reports);
  elements.reportsNavigation.toggleAttribute('aria-current', reports);

  if (reports) {
    elements.reportsScreen.scrollTop = 0;
    resetReportScreen();
  } else {
    clearReportOutput();
    window.requestAnimationFrame(() => state.calendar?.render());
  }
}

async function generateCurrentReport() {
  const mode = reportMode();
  const events = await listEvents();
  const rows = generateReport({
    events,
    tasks: state.tasks,
    selectedProjectIds: selectedReportProjectIds(),
    startDate: elements.reportStartDate.value,
    endDate: elements.reportEndDate.value,
    mode
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
  const type = state.report.mode === 'detailed' ? 'detalhado' : 'agrupado';
  return `rics-time-blocking-relatorio-${type}-${state.report.startDate}-a-${state.report.endDate}.${extension}`;
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
  const blob = new Blob([reportCsv(state.report)], { type: 'text/csv;charset=utf-8' });
  downloadReportFile(blob, 'csv');
}

async function exportCurrentReportPdf() {
  if (!state.report.generated || !state.report.rows.length) return;
  const button = elements.reportExportPdfButton;
  const label = button.querySelector('span');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  label.textContent = 'Gerando PDF…';

  try {
    const blob = await reportPdf(state.report);
    downloadReportFile(blob, 'pdf');
    notify('PDF exportado com sucesso.');
  } catch (error) {
    console.error(error);
    notify('Não foi possível exportar o PDF.', 'error');
  } finally {
    button.removeAttribute('aria-busy');
    button.disabled = !state.report.rows.length;
    label.textContent = 'Exportar PDF';
  }
}

function wireEvents() {
  elements.planningNavigation.addEventListener('click', () => setActiveScreen('planning'));
  elements.reportsNavigation.addEventListener('click', () => setActiveScreen('reports'));

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
      setReportFormStatus(error.message || 'Não foi possível gerar o relatório.', 'error');
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

  elements.fizzySyncButton.addEventListener('click', () => syncFizzy());
  elements.fizzySettingsButton.addEventListener('click', () => openFizzyDialog());
  elements.fizzyVerifyButton.addEventListener('click', () => verifyFizzyToken());

  elements.fizzyToken.addEventListener('input', () => {
    if (elements.fizzyToken.value.trim()) {
      elements.fizzySaveButton.disabled = true;
      setFizzyFormStatus('Verifique o novo token antes de salvar.');
    } else if (state.fizzy.connection) {
      elements.fizzySaveButton.disabled = false;
      setFizzyFormStatus(`Conectado à conta ${state.fizzy.connection.accountName}.`);
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
      setFizzyFormStatus('Verifique o token e escolha uma conta.', 'error');
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
      setFizzyFormStatus(error.message, 'error');
    }
  });

  elements.fizzyDisconnectButton.addEventListener('click', async () => {
    await deleteIntegration('fizzy');
    state.fizzy.connection = null;
    state.fizzy.accounts = [];
    closeDialog(elements.fizzyDialog);
    renderFizzyConnection();
    notify('Fizzy desconectado. As tarefas já importadas foram mantidas.');
  });

  elements.trelloSyncButton.addEventListener('click', () => syncTrello());
  elements.trelloSettingsButton.addEventListener('click', () => openTrelloDialog());
  elements.trelloAuthorizeButton.addEventListener('click', openTrelloAuthorization);
  elements.trelloVerifyButton.addEventListener('click', () => verifyTrelloAccess());

  const handleTrelloCredentialInput = () => {
    updateTrelloSelectionState();
    if (trelloCredentialSignature() !== state.trello.verifiedSignature) {
      setTrelloFormStatus('Verifique a nova API Key e o token antes de salvar.');
    } else if (state.trello.connection) {
      setTrelloFormStatus(`Conectado como ${state.trello.connection.memberName}.`);
    }
  };

  elements.trelloApiKey.addEventListener('input', handleTrelloCredentialInput);
  elements.trelloToken.addEventListener('input', handleTrelloCredentialInput);

  elements.trelloForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.trello.setup || elements.trelloSaveButton.disabled) {
      setTrelloFormStatus(
        'Verifique o acesso e escolha ao menos um quadro.',
        'error'
      );
      return;
    }

    const { boardIds, doneListIds } = selectedTrelloConfiguration();
    const { apiKey, accessToken } = trelloCredentials();

    if (!boardIds.length) {
      setTrelloFormStatus('Escolha ao menos um quadro do Trello.', 'error');
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
      setTrelloFormStatus(error.message, 'error');
    }
  });

  elements.trelloDisconnectButton.addEventListener('click', async () => {
    await deleteIntegration('trello');
    state.trello.connection = null;
    state.trello.setup = null;
    state.trello.verifiedSignature = '';
    closeDialog(elements.trelloDialog);
    renderTrelloConnection();
    notify('Trello desconectado. As tarefas já importadas foram mantidas.');
  });

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
        notify('Projeto criado.');
      } else {
        await updateProject(state.editingProjectId, values);
        notify('Projeto atualizado.');
      }
      closeDialog(elements.projectDialog);
      await refreshData();
    } catch (error) {
      setProjectFormStatus(error.message, 'error');
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
      notify('Projeto da tarefa atualizado.');
    } catch (error) {
      setTaskProjectFormStatus(error.message, 'error');
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
        setTaskFormStatus('Tarefa adicionada. Digite a próxima.', 'success');
        elements.addTaskTitle.focus();
      } else {
        closeDialog(elements.taskDialog);
        notify('Tarefa adicionada.');
      }
    } catch (error) {
      setTaskFormStatus(error.message, 'error');
      elements.addTaskTitle.focus();
      elements.addTaskTitle.select();
    }
  });

  document.querySelector('#confirm-delete').addEventListener('click', async () => {
    if (!state.pendingDeleteTask) return;
    try {
      const deletedEvents = await deleteTaskAndFutureEvents(state.pendingDeleteTask);
      for (const event of deletedEvents) state.calendar.removeEvent(event);
      state.tasks = state.tasks.filter(
        (task) => Number(task.id) !== Number(state.pendingDeleteTask.id)
      );
      state.pendingDeleteTask = null;
      renderTasks();
      closeDialog(elements.deleteDialog);
      notify('Tarefa removida. O histórico foi preservado.');
    } catch (error) {
      notify(error.message, 'error');
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
      document.querySelector('.more-menu').open = false;
      notify('Backup exportado.');
    } catch (error) {
      notify(error.message, 'error');
    }
  });

  document.querySelector('#import-button').addEventListener('click', () => {
    document.querySelector('.more-menu').open = false;
    elements.importFile.click();
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
        applyPreferences();
        await refreshData();
        notify(
          `${result.taskCount} tarefas e ${result.eventCount} blocos importados.`
        );
      } catch (error) {
        notify(error.message, 'error');
      }
    });
  });

  elements.calendarPane.addEventListener('dragover', (event) => {
    if (!event.dataTransfer.types.includes('application/x-bloco-task')) return;
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
    const taskId = Number(event.dataTransfer.getData('application/x-bloco-task'));
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
      notify('Bloco de 30 minutos adicionado. Arraste a borda para ajustar.');
    } catch (error) {
      notify(error.message, 'error');
    }
  });

  const observer = new ResizeObserver(() => state.calendar?.render());
  observer.observe(elements.calendarPane);
}

async function init() {
  await Promise.all([
    loadPreferences(),
    getIntegration('fizzy').then((connection) => {
      state.fizzy.connection = connection || null;
    }),
    getIntegration('trello').then((connection) => {
      state.trello.connection = connection || null;
    })
  ]);

  state.calendar = createCalendar(elements.calendar, {
    onRequestCreate() {
      state.calendar.clearSelection();
    },
    async onRequestEventDetails(event) {
      const task = Number.isFinite(event.taskId) ? await getTask(event.taskId) : null;
      openTaskProjectDialog(task);
    },
    async onUpdate(id, changes) {
      await updateEvent(id, changes);
      notify('Bloco atualizado.');
    },
    async onDelete(id) {
      await deleteEvent(id);
      notify('Bloco removido.');
    },
    onRangeChange: formatRangeTitle,
    async onViewChange(view) {
      state.preferences.view = view;
      elements.shell.dataset.view = view;
      elements.viewSelect.value = view;
      await setSetting('view', view);
    },
    onError(error) {
      notify(error.message || 'Não foi possível atualizar o calendário.', 'error');
      refreshData();
    }
  });

  applyPreferences();
  renderProjectColorPresets();
  wireEvents();
  renderFizzyConnection();
  renderTrelloConnection();
  await refreshData();

  registerSW({
    onOfflineReady() {
      notify('O Rics Time-blocking está pronto para uso offline.');
    },
    onRegisterError() {
      notify('Não foi possível ativar o modo offline.', 'error');
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
  app.querySelector('.fatal-error p').textContent = error.message;
});
