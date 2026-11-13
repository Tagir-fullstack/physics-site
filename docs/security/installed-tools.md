# Локальные инструменты Codex

Дата: 11 ноября 2026. Настройки подготовлены для проекта physics-site, без изменения опубликованного сайта.

- **Playwright MCP**: официальный пакет Microsoft `@playwright/mcp@0.0.85`, stdio, Chrome, headless, isolated, screenshot/vision. Настроен в `.codex/config.toml`; `codex mcp list --json` подтверждает enabled. Выполнены initialize, tools/list (31 инструмент), browser_navigate на локальный каталог Physez, browser_resize 667×375 и browser_take_screenshot. Артефакты — `node_modules/.cache/playwright-mcp`, исключены из git вместе с node_modules. После перезапуска клиента сервер сможет появиться в его наборе инструментов; проверка отдельным MCP-клиентом не означает, что сервер уже добавлен в текущий чат.
- **UI UX Pro Max**: проектный навык `.agents/skills/ui-ux-pro-max`, исходный commit и MIT license сохранены рядом. Python-поиск по запросу `mobile landscape layout --domain ux` успешно вернул рекомендации для мобильного viewport.
- **Skillui для macOS**: приложение neogenz/skillui, release `v0.1.0-beta.6`, установлено в `/Users/tagir/Applications/Skillui.app`. SHA-256 образа совпал с опубликованным digest `424db1453eb50df55da8e46141eef5f3d0e5275551b3ad7420ad8cf8380e6210`; codesign --verify --deep --strict и spctl --assess приняли сборку. Приложение не запускалось, автозапуск/автообновление и синхронизация навыков не включались. Проверенная ранее одноимённая сборка modstart-lib/skillui 0.2.0 имела недействительную подпись, не запускалась и была удалена из Applications; исходный DMG оставлен в Downloads.
- **Context7**: не установлен. Каталог плагинов вернул `DISABLED_BY_ADMIN`, `NOT_AVAILABLE`. Альтернативное подключение того же провайдера не создавалось. Нужна смена политики администратором среды.

Источники:
- https://playwright.dev/docs/next/getting-started-mcp
- https://github.com/microsoft/playwright-mcp
- https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/neogenz/skillui/releases/tag/v0.1.0-beta.6
