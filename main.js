const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

/* Inicialização */
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/* Fecha app */
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

/* GERAR PDF */
ipcMain.handle('gerar-pdf', async (event, config = {}) => {
  console.log("Gerando PDF...");

  try {
    // Salva o tamanho original do conteúdo da janela (para restaurar se necessário)
    const [larguraOriginal, alturaOriginal] = win.getContentSize();

    // Esconde elementos no-print sem forçar dimensões na raiz —
    // deixar que `preferCSSPageSize: true` e @page no CSS controlem o tamanho.
    await win.webContents.executeJavaScript(`
      document.querySelectorAll('.no-print, .topbar, .btn-topo, .menu, .container').forEach(el => {
        el.setAttribute('data-display-backup', el.style.display);
        el.style.display = 'none';
      });
      document.body.style.background = 'white';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    `);

    // Pausa para o DOM atualizar com o novo tamanho
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    // Restaura elementos escondidos
    await win.webContents.executeJavaScript(`
      document.querySelectorAll('[data-display-backup]').forEach(el => {
        el.style.display = el.getAttribute('data-display-backup') || '';
        el.removeAttribute('data-display-backup');
      });
      document.body.style.background = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    `);

    const filePath = path.join(app.getPath('desktop'), 'etiquetas.pdf');
    fs.writeFileSync(filePath, pdf);

    return filePath;

  } catch (erro) {
    console.error("Erro ao gerar PDF:", erro);
    // Garante restauração do tamanho mesmo em caso de erro
    win.setContentSize(1300, 800);
    throw erro;
  }
});