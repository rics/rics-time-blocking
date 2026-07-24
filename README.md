# Bloco

MVP local-first para planejar tarefas com time blocking. O calendário usa
TOAST UI Calendar e os dados ficam no IndexedDB do próprio navegador via Dexie.

## Rodar localmente

```bash
npm install
npm run dev
```

Para validar o pacote de produção:

```bash
npm run build
npm run preview
```

## O que o MVP já cobre

- Visões mensal, semanal, diária, 2 semanas e 3 semanas
- Finais de semana estreitos ou ocultos
- Lista de tarefas persistente, recolhível e responsiva
- Uma mesma tarefa agendada várias vezes
- Criação por seleção no calendário, botão ou arrastar para o calendário
- Drag-and-drop e redimensionamento de eventos
- Exclusão de tarefa com remoção apenas dos eventos futuros relacionados
- Sincronização manual de cards em aberto do Fizzy e do Trello
- Backup JSON com importação por mesclagem ou substituição
- PWA instalável e cache do app para uso offline

## Dados locais

O IndexedDB não usa o pequeno limite típico do `localStorage`, mas sua cota
continua dependendo do navegador, dispositivo e espaço disponível. O backup
JSON é a forma recomendada de portabilidade.

O arquivo exportado contém:

```json
{
  "format": "bloco-backup",
  "version": 2,
  "exportedAt": "ISO-8601",
  "tasks": [],
  "events": [],
  "settings": []
}
```

Credenciais de integrações ficam somente no navegador e não são incluídas no
backup.

Na importação, **mesclar** faz upsert pelos IDs do backup. **Substituir** limpa
as três stores antes de importar.

## Estrutura

```text
.
├── AGENTS.md
├── public/
│   ├── app-icon.svg
│   ├── fizzy.png
│   └── trello.svg
├── src/
│   ├── backup.js
│   ├── calendar.js
│   ├── db.js
│   ├── fizzy.js
│   ├── main.js
│   ├── style.css
│   └── trello.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Próximos passos sugeridos

1. Adicionar duração padrão por tarefa.
2. Separar calendários/projetos com cores.
3. Criar edição completa do bloco ao clicar no evento.
4. Adicionar recorrência e pesquisa.
5. Incluir testes automatizados com IndexedDB em memória.
6. Adicionar sincronização opcional, mantendo o modo local como padrão.
