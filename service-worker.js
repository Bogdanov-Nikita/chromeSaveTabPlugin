// Позволяет пользователям открывать боковую панель, нажав на значок на панели инструментов действий
browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));