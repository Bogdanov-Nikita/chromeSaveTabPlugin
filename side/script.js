const groupByDomainCheckbox = document.getElementById('groupByDomain');
// Элементы интерфейса
const saveToPlainText = document.getElementById('saveToPlainText');
const saveToHTMLText = document.getElementById('saveToHTML');
const saveToJSONText = document.getElementById('saveToJSON');
const importJSONFile = document.getElementById('importJSONFile');
const restoreFromFile = document.getElementById('restoreFromFile');

// Список кнопок для управления их доступностью (UI Lock)
const uiButtons = [saveToPlainText, saveToHTMLText, saveToJSONText, restoreFromFile];

// Запускаем локализацию сразу после полной загрузки DOM-дерева страницы
document.addEventListener('DOMContentLoaded', initInterfaceLocalization);

/**
 * Переключатель блокировки интерфейса во время асинхронных операций
 */
function toggleUI(disabled) {
    uiButtons.forEach(btn => {
        if (btn) btn.disabled = disabled;
    });
}

/**
 * Функция для безопасного экранирования HTML (Защита от XSS)
 */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

//Обработчики клика кнопок
saveToPlainText.addEventListener('click', async () => {
    await processingSaveTabs("text/plain")
});

saveToHTMLText.addEventListener('click', async () => {
    await processingSaveTabs("text/html")
});

saveToJSONText.addEventListener('click', async () => {
    await processingSaveTabs("application/json")
});

restoreFromFile.addEventListener('click', async () => {
    importJSONFile.click();
});

// Обработка выбранного файла
importJSONFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const jsonContent = e.target.result;
        toggleUI(true);
        // Вызываем функцию восстановления
        await restoreTabsFromJSON(jsonContent);
        toggleUI(false);
        // Сбрасываем значение инпута, чтобы можно было загрузить тот же файл повторно
        importJSONFile.value = '';
    };
    reader.readAsText(file);
});

/**
 * Получение ссылок, формирование контента и сохранение в файл
 */
async function processingSaveTabs(type) {
    toggleUI(true);
    try {
        // Текущая дата
        const date = new Date().toISOString().slice(0, 10);
        // Читаем состояние чекбокса (по умолчанию false, если элемент вдруг не найден)
        const shouldGroup = groupByDomainCheckbox ? groupByDomainCheckbox.checked : false;
        //Имя файла
        let fileName = "Saved tabs" + ((shouldGroup) ? " grouped " : " ") + date;

        //Получение ссылок
        const browserTabs = await browser.tabs.query({});

        //Формирование текста
        let text = "";
        switch (type) {
            case "text/html":
                text = processingHTMLFromTabs(browserTabs, shouldGroup);
                fileName = fileName + ".html";
                break;
            case "text/plain":
                text = processingTXTFromTabs(browserTabs, shouldGroup)
                fileName = fileName + ".txt";
                break;
            case "application/json":
                text = processingJSONFromTabs(browserTabs, shouldGroup);
                fileName = fileName + ".json";
                break;
        }

        //Сохранение в файл
        saveToFile(text, fileName, type);

    } catch (error) {
        console.error("Ошибка при сохранении вкладок:", error);
        alert("Не удалось сохранить вкладки: " + error.message);
    } finally {
        toggleUI(false);
    }
}

/**
 * Формирование TXT текста c локализацией (i18n)
 */
function processingTXTFromTabs(browserTabs, shouldGroup) {
    // Получаем переводы из системы i18n расширения
    const msgPageTitle = browser.i18n.getMessage("pageTitle") || "Saved Tabs";
    const msgTotalTabs = browser.i18n.getMessage("totalTabs") || "Total tabs:";
    const msgNoTitle = browser.i18n.getMessage("noTitle") || "Untitled";
    const msgNoUrl = browser.i18n.getMessage("noURL") || "noURL";
    const msgLocalPages = browser.i18n.getMessage("localPages") || "Local / Browser pages";

    let textData = msgPageTitle + "\r\n\r\n";
    if (shouldGroup) {
        // Группированный вывод
        const groups = {};
        for (const tab of browserTabs) {
            let domain = msgLocalPages;
            if (tab.url) {
                try {
                    const urlObj = new URL(tab.url);
                    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
                        domain = urlObj.hostname.replace("www.", "");
                    }
                } catch (e) {
                }
            }
            if (!groups[domain]) {
                groups[domain] = [];
            }
            groups[domain].push(tab);
        }

        for (const domain of Object.keys(groups).sort()) {
            textData += `=== ${domain} ===\r\n`;
            for (const tab of groups[domain]) {
                textData += "[" + (tab.title || msgNoTitle) + "]\r\n";
                textData += (tab.url || msgNoUrl) + "\r\n\r\n";
            }
        }
    } else {
        // Плоский список (в порядке вкладок в браузере)
        for (const tab of browserTabs) {
            textData += "[" + (tab.title || msgNoTitle) + "]\r\n";
            textData += (tab.url || msgNoUrl) + "\r\n\r\n";
        }
    }
    textData = textData + msgTotalTabs + " " + browserTabs.length.toString();
    return textData
}

/**
 * Формирование JSON данных с группировкой по доменам с локализацией (i18n)
 */
function processingJSONFromTabs(browserTabs, shouldGroup) {
    const msgLocalPages = browser.i18n.getMessage("localPages") || "Local / Browser pages";

    // Объект для группировки данных
    const exportData = {
        exportDate: new Date().toISOString(),
        totalTabsCount: browserTabs.length,
        isGrouped: shouldGroup, // сохраняем флаг, чтобы парсер знал структуру
        groups: {}
    };

    if (shouldGroup) {
        for (const tab of browserTabs) {
            let domain = msgLocalPages;
            if (tab.url) {
                try {
                    const urlObj = new URL(tab.url);
                    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
                        domain = urlObj.hostname.replace("www.", "");
                    }
                } catch (e) {
                }
            }

            if (!exportData.groups[domain]) {
                exportData.groups[domain] = [];
            }

            // Сохраняем только полезные и чистые свойства вкладки
            exportData.groups[domain].push({
                title: tab.title || "",
                url: tab.url || "",
                favIconUrl: tab.favIconUrl || ""
            });
        }
    } else {
        // Если группировка выключена, складываем всё в один общий ключ "all"
        exportData.groups["all"] = browserTabs.map(tab => ({
            title: tab.title || "",
            url: tab.url || "",
            favIconUrl: tab.favIconUrl || ""
        }));
    }
    // Возвращаем отформатированную JSON-строку с отступами в 2 пробела для читаемости
    return JSON.stringify(exportData, null, 2);
}

/**
 * Формирование HTML текста с группировкой по доменам, иконками, сворачиванием и локализацией (i18n)
 */
function processingHTMLFromTabs(browserTabs, shouldGroup) {
    // Получаем переводы из системы i18n расширения
    const msgPageTitle = browser.i18n.getMessage("pageTitle") || "Saved Tabs";
    const msgTotalTabs = browser.i18n.getMessage("totalTabs") || "Total tabs:";
    const msgLocalPages = browser.i18n.getMessage("localPages") || "Local / Browser pages";
    const msgNoTitle = browser.i18n.getMessage("noTitle") || "Untitled";
    const msgAllTabsGroup = "Все вкладки"; // Заглушка для не группированного вывода


    let textData = "<!DOCTYPE html>\r\n<html lang=''>\r\n<head>\r\n<meta charset='utf-8'>\r\n";
    textData += "<meta name='viewport' content='width=device-width, initial-scale=1'>\r\n";
    textData += `<title>${escapeHTML(msgPageTitle)}</title>\r\n`;

    // Блок CSS-стилей
    textData += "<style>\r\n";
    textData += "  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; color: #212529; padding: 2rem 1rem; margin: 0; }\r\n";
    textData += "  .container { max-width: 800px; margin: 0 auto; }\r\n";
    textData += "  h1 { font-size: 2.5rem; font-weight: 500; margin-bottom: 1.5rem; color: #1a1d20; border-bottom: 2px solid #dee2e6; padding-bottom: 0.5rem; }\r\n";
    textData += "  details.card { background: #fff; border: 1px solid #dee2e6; border-radius: 0.5rem; box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05); margin-bottom: 1.5rem; overflow: hidden; display: block; }\r\n";
    textData += "  summary.card-header { background-color: #f8f9fa; padding: 0.75rem 1.25rem; font-weight: 600; border-bottom: 1px solid #dee2e6; color: #495057; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; list-style: none; }\r\n";
    textData += "  summary.card-header::-webkit-details-marker { display: none; }\r\n";
    textData += "  summary.card-header:hover { background-color: #e9ecef; }\r\n";
    textData += "  summary.card-header::after { content: '▼'; font-size: 0.75rem; color: #6c757d; margin-left: auto; transition: transform 0.2s ease; }\r\n";
    textData += "  details[open] summary.card-header::after { transform: rotate(-180deg); }\r\n";
    textData += "  details[open] summary.card-header { border-bottom: 1px solid #dee2e6; }\r\n";
    textData += "  details:not([open]) summary.card-header { border-bottom: none; }\r\n";
    textData += "  .list-group { display: flex; flex-direction: column; padding-left: 0; margin-bottom: 0; list-style: none; }\r\n";
    textData += "  .list-group-item { position: relative; display: flex; align-items: center; padding: 0.75rem 1.25rem; background-color: #fff; border: none; border-bottom: 1px solid #dee2e6; text-decoration: none; color: #0d6efd; transition: background-color 0.15s ease-in-out; }\r\n";
    textData += "  .list-group-item:last-child { border-bottom: none; }\r\n";
    textData += "  .list-group-item:hover { background-color: #f8f9fa; color: #0a58ca; text-decoration: underline; }\r\n";
    textData += "  .tab-icon { width: 16px; height: 16px; margin-right: 0.75rem; flex-shrink: 0; border-radius: 2px; }\r\n";
    textData += "  .tab-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; }\r\n";
    textData += "  .badge { display: inline-block; padding: 0.35em 0.65em; font-size: 0.75em; font-weight: 700; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.375rem; margin-right: 1rem; }\r\n";
    textData += "  .badge-secondary { color: #fff; background-color: #6c757d; }\r\n";
    textData += "  .badge-info { color: #fff; background-color: #0dcaf0; font-size: 0.9em; padding: 0.5em 0.75em; }\r\n";
    textData += "  .footer-info { margin-top: 2rem; color: #6c757d; font-weight: 500; }\r\n";
    textData += "</style>\r\n</head>\r\n<body>\r\n";

    textData += "<div class='container'>\r\n";
    textData += `  <h1>${escapeHTML(msgPageTitle)}</h1>\r\n`;

    const defaultIcon = "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='16' height='16' fill='%236c757d' class='bi bi-globe' viewBox='0 0 16 16'><path d='M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 1H1.661c-.12.316-.204.64-.25 1h2.476c-.045-.36-.078-.723-.078-1zm.078 2H1.41c.046.36.13.684.25 1h1.847c0-.36.033-.723.078-1zm.582 2H2.255a7.025 7.025 0 0 0 3.072 2.472 6.7 6.7 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 9zm1.523 0H7.5V11.92c-.67-.204-1.335-.82-1.887-1.855A7.97 7.97 0 0 1 5.613 9zm3.774 0H8.5V11.92c.67-.204 1.335-.82 1.887-1.855A7.97 7.97 0 0 0 10.387 9zm1.523 0h1.834a7.025 7.025 0 0 0-3.072 2.472c.218-.284.418-.598.597-.933.245-.453.467-.971.641-1.539zm.582-2h2.476c-.046-.36-.13-.684-.25-1h-2.304c.045.36.078.723.078 1zm-.078-2h2.304c.12-.316.204-.64.25-1h-2.476c.045.36.078.723.078 1zm-.582-2a7.025 7.025 0 0 0-3.072-2.472c.218.284.418.598.597.933.245.453.467.971.641 1.539H11.91zM8.5 4h2.355a7.967 7.967 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4zM7.5 5v1H4.41c-.045.316-.077.64-.077 1h3.167V5zm0 3H4.333c0 .36.032.684.077 1H7.5V8zm1-3v1h3.083c.045-.36.077-.684.077-1H8.5V5zm0 3v1h3.16c-.045-.316-.077-.64-.077-1H8.5z'/></svg>";

    // Группировка вкладок по доменам
    const groups = {};

    if (shouldGroup) {
        for (const tab of browserTabs) {
            let domain = msgLocalPages; // Используем локализованную заглушку
            if (tab.url) {
                try {
                    const urlObj = new URL(tab.url);
                    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
                        domain = urlObj.hostname.replace("www.", "");
                    }
                } catch (e) {
                }
            }
            if (!groups[domain]) {
                groups[domain] = [];
            }
            groups[domain].push(tab);
        }
    } else {
        // При выключенном чекбоксе собираем всё в одну карточку "Все вкладки"
        groups[msgAllTabsGroup] = browserTabs;
    }

    // Сортировка доменов по алфавиту
    const sortedDomains = Object.keys(groups).sort();

    // Генерация карточек
    for (const domain of sortedDomains) {
        const tabsInGroup = groups[domain];

        textData += "  <details class='card' open>\r\n";
        textData += `    <summary class='card-header'>\r\n`;
        textData += `      <span>${escapeHTML(domain)}</span>\r\n`;
        textData += `      <span class='badge badge-secondary'>${tabsInGroup.length}</span>\r\n`;
        textData += `    </summary>\r\n`;
        textData += "    <div class='list-group'>\r\n";

        for (const tab of tabsInGroup) {
            const url = tab.url || "#";
            const iconUrl = tab.favIconUrl ? tab.favIconUrl : defaultIcon;
            // Используем локализованную заглушку
            const rawTitle = tab.title || tab.url || msgNoTitle;
            // Экранирование всех атрибутов для безопасности
            const safeUrl = escapeHTML(url);
            const safeIconUrl = escapeHTML(iconUrl);
            const safeTitle = escapeHTML(rawTitle);

            textData += `      <a href="${safeUrl}" target="_blank" class="list-group-item" title="${safeTitle}">\r\n`;
            textData += `        <img src="${iconUrl}" class="tab-icon" alt="icon" onerror="this.src='${defaultIcon}';">\r\n`;
            textData += `        <span class="tab-title">${safeTitle}</span>\r\n`;
            textData += `      </a>\r\n`;
        }

        textData += "    </div>\r\n";
        textData += "  </details>\r\n";
    }

    textData += `  <div class='footer-info'>${escapeHTML(msgTotalTabs)} <span class='badge badge-info'>${browserTabs.length}</span></div>\r\n`;
    textData += "</div>\r\n";
    textData += "</body>\r\n</html>";

    return textData;
}

/**
 * Восстановление вкладок из структуры JSON:
 * большие группы больше 10 вкладок — в свои окна,
 * остальные — пачками по 20 штук в новые окна.
 */
async function restoreTabsFromJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        if (!data || !data.groups) {
            console.error("Неверный формат JSON-файла");
            return;
        }

        // Сюда будем собирать вкладки из маленьких групп (где <= 10 вкладок)
        let smallGroupsUrls = [];

        // 1. Проходим по всем группам в JSON
        for (const domain in data.groups) {
            const tabsInGroup = data.groups[domain];

            // Фильтруем и собираем только валидные URL
            const validUrls = tabsInGroup
                .map(tab => tab.url)
                .filter(url => url && url !== "#");

            if (validUrls.length === 0) continue;

            // Если в группе больше 10 вкладок: Открываем для неё отдельное окно
            if (validUrls.length > 10) {
                await browser.windows.create({
                    url: validUrls,
                    focused: false // чтобы не перебивать фокус пользователя, пока создаются окна
                });
            } else {
                // Иначе откладываем в общий список для нарезки по 20 штук
                smallGroupsUrls = smallGroupsUrls.concat(validUrls);
            }
        }

        // 2. Нарезаем оставшиеся вкладки из маленьких групп на порции по 20 штук
        const chunkSize = 20;
        for (let i = 0; i < smallGroupsUrls.length; i += chunkSize) {
            const chunk = smallGroupsUrls.slice(i, i + chunkSize);

            await browser.windows.create({
                url: chunk,
                focused: false
            });
        }

    } catch (error) {
        console.error("Ошибка при восстановлении вкладок:", error);
        alert("Ошибка при восстановлении вкладок:" + error.message);
    }
}

/**
 * Сохранение в файл
 */
function saveToFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], {type});
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    // Очистка памяти
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Функция для динамического перевода элементов интерфейса боковой панели
 */
function initInterfaceLocalization() {
    // Вспомогательная функция для безопасной вставки перевода в текстовый контент элемента
    const translateElement = (id, messageKey) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = browser.i18n.getMessage(messageKey) || element.textContent;
        }
    };

    // Переводим заголовки и описания
    translateElement('lblPageCardTitle', 'pageCardTitle');
    translateElement('lblPageCardDescription', 'pageCardDescription');
    translateElement('lblRestoreSessionTitle', 'restoreSessionTitle');
    translateElement('lblRestoreSessionDesc', 'restoreSessionDesc');
    translateElement('restoreFromFile', 'btnRestoreFromFile');

    // Переводим текст возле чекбокса (для этого добавьте id="lblGroupByDomain" к тегу <label> в HTML)
    translateElement('lblGroupByDomain', 'optionGroupByDomain');

    // Локализация элементов выпадающего списка (Dropdown)
    const dropdownContainer = document.getElementById('exportDropdownContainer');
    if (dropdownContainer) {
        // Переводим главную кнопку дропдауна
        const toggleBtn = dropdownContainer.querySelector('.dropdown-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = browser.i18n.getMessage('exportDropdownButton') || toggleBtn.textContent;
        }

        // Переводим пункты меню внутри дропдауна по их ID
        translateElement('saveToPlainText', 'exportFormatTxt');
        translateElement('saveToHTML', 'exportFormatHtml');
        translateElement('saveToJSON', 'exportFormatJson');
    }
}









