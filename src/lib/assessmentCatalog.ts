export const ASSESSMENT_CATALOG = [
  { id: 'mechanics', name: 'Механика', description: '3 задачи · 50 минут', endpoint: '/api/mechanics-assessment', route: '/assessment/mechanics' },
  { id: 'midterm', name: 'Рубежный срез', description: '3 теории + 4 задачи · 50 минут · 8 баллов', endpoint: '/api/midterm-assessment', route: '/assessment/midterm' },
  { id: 'molecular', name: 'Молекулярная физика', description: '8 задач · 50 минут · 4 балла', endpoint: '/api/molecular-assessment', route: '/assessment/molecular' },
] as const
