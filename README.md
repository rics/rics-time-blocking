# Bloco

**Bloco** é um calendário de *time blocking* para transformar tarefas em tempo reservado na agenda. Você cria uma lista de tarefas e arrasta cada uma para o calendário, definindo quando pretende realizá-la.

Os dados ficam no seu próprio navegador. Não é necessário criar conta para usar o app, e tarefas, blocos e preferências continuam disponíveis entre sessões. Depois de carregado, o app também pode ser instalado e usado offline.

## O que você pode fazer

- Criar uma lista simples de tarefas e reutilizar uma mesma tarefa quantas vezes quiser.
- Arrastar tarefas para o calendário e ajustar a duração dos blocos.
- Mover ou redimensionar blocos diretamente na agenda.
- Alternar entre as visões mensal, semanal, diária, de 2 semanas e de 3 semanas.
- Ocultar ou estreitar os fins de semana.
- Pesquisar tarefas e recolher a barra lateral quando precisar de mais espaço.
- Importar cards em aberto do Fizzy ou Trello, caso queira conectar essas ferramentas.
- Exportar e importar backups em JSON para levar seus dados a outro navegador ou dispositivo.

Ao excluir uma tarefa, os blocos futuros associados são removidos; os blocos que já começaram são preservados como histórico.

## Como funciona

1. Adicione uma tarefa na barra lateral.
2. Arraste-a para o horário desejado no calendário. Um bloco de 30 minutos é criado.
3. Arraste o bloco ou sua borda para reposicioná-lo e ajustar sua duração.
4. A tarefa continua disponível na lista para você agendá-la novamente quando quiser.

Use o menu de três pontos no canto superior direito para exportar um backup. Na importação, você pode escolher entre mesclar os dados com os existentes ou substituí-los.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou mais recente (a versão LTS é recomendada).
- npm, que já vem com o Node.js.
- Git, apenas se você for clonar este repositório.

## Instalação e execução rápida

No Windows PowerShell, clone o repositório e entre na pasta do projeto:

```powershell
git clone https://github.com/rics/rics-time-blocking.git
cd rics-time-blocking
```

Instale as dependências e inicie o servidor local:

```powershell
npm install
npm run dev
```

O terminal mostrará um endereço semelhante a `http://localhost:5173`. Abra-o no navegador para usar o Bloco.

Para criar a versão de produção e testá-la localmente:

```powershell
npm run build
npm run preview
```

## Seus dados

Tarefas, eventos e preferências são armazenados localmente no IndexedDB do navegador. Os backups são arquivos JSON portáteis. Credenciais usadas nas integrações com Fizzy e Trello ficam somente no navegador e não fazem parte do backup.

---

Este é um projeto pessoal de [Ricardo Silva](https://ricsilva.com).
