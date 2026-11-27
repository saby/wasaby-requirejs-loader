export default function showErrorDialog(
    message: string,
    buttonText: string = 'ОК',
    onConfirm: () => void
) {
    // Удаляем старые экземпляры, если они ещё висят
    const existingDialog = document.getElementById('custom-alert-dialog');
    const existingOverlay = document.getElementById('custom-alert-overlay');
    if (existingDialog) existingDialog.remove();
    if (existingOverlay) existingOverlay.remove();

    // 1. Затемняющий overlay — блокирует взаимодействие со страницей
    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1999;
  `;

    // 2. Сам диалог (контейнер вместо нативного <dialog>)
    const dialog = document.createElement('div');
    dialog.id = 'custom-alert-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-labelledby', 'confirmation-message');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2000;
      box-sizing: border-box;
      width: 350px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 8px;
      overflow: auto;
      background: #fff;
      box-shadow: 0 0 46px rgba(0, 0, 0, 0.12), 0 0 15px rgba(0, 0, 0, 0.12);
      color: #000;
      font-family: "Inter", "Twemoji Mozilla", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", sans-serif;
      font-size: 14px;
      line-height: normal;
      letter-spacing: -0.1974px;
      text-align: left;
  `;

    // 3. Внутренний контейнер с градиентным фоном
    const inner = document.createElement('div');
    inner.style.cssText = `
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      border-radius: 8px;
      background-color: rgba(220, 34, 25, 0.08);
      background-image: radial-gradient(210% 260% at 25% -15%, rgb(255, 255, 255) 0, rgba(255, 255, 255, 0) 100%);
  `;

    // 4. Красный индикатор-полоска сверху
    const indicatorWrap = document.createElement('div');
    indicatorWrap.style.cssText = 'display: flex; flex-shrink: 0;';

    const indicator = document.createElement('div');
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.cssText = `
      width: 40px;
      height: 3px;
      min-height: 3px;
      margin: 20px auto;
      border-radius: 24px;
      background: #dc2219;
  `;
    indicatorWrap.appendChild(indicator);
    inner.appendChild(indicatorWrap);

    // 5. Заголовок «Сайт был обновлён»
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Сайт был обновлен';
    titleEl.style.cssText = `
      box-sizing: border-box;
      margin-bottom: 8px;
      color: #000;
      font-size: 18px;
      line-height: 24px;
      letter-spacing: -0.1974px;
      text-align: center;
  `;
    inner.appendChild(titleEl);

    // 6. Текст ошибки (основной блок)
    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'box-sizing: border-box; padding: 0 24px 24px;';

    const textEl = document.createElement('div');
    textEl.id = 'confirmation-message';
    textEl.textContent = message;
    textEl.style.cssText = `
      margin: 0;
      padding: 0;
      color: #656C87;
      font-size: 15px;
      line-height: 20px;
      letter-spacing: -0.1974px;
      text-align: center;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
  `;
    textWrap.appendChild(textEl);
    inner.appendChild(textWrap);

    // 7. Кнопка
    const formWrap = document.createElement('div');
    formWrap.style.cssText = `
      display: flex;
      flex-shrink: 0;
      align-items: baseline;
      justify-content: center;
      margin: 0;
      padding: 0 24px 24px;
      border: 0;
  `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = buttonText;
    btn.style.cssText = `
      appearance: none;
      display: inline-block;
      box-sizing: border-box;
      min-width: 86px;
      height: 24px;
      width: 126.05px;
      margin: 0;
      padding: 0 12px;
      border: 0.8px solid #F88F62;
      border-radius: 100px;
      background: #fff;
      box-shadow: none;
      color: #000;
      font-family: "Inter", "Twemoji Mozilla", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", sans-serif;
      font-size: 14px;
      font-weight: 400;
      line-height: 22.4px;
      letter-spacing: -0.1974px;
      text-align: center;
      white-space: nowrap;
      cursor: pointer;
  `;

    btn.addEventListener(
        'click',
        () => {
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
            overlay.remove();
            dialog.remove();
        },
        { once: true }
    );

    formWrap.appendChild(btn);
    inner.appendChild(formWrap);

    // Сборка
    dialog.appendChild(inner);
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    btn.focus();
}
