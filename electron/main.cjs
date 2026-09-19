const { app, BrowserWindow, dialog, net, protocol } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const { startDesktopServer } = require('./desktop-server.cjs')
let localServer = null
let mainWindow = null

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

async function startServer() {
  if (localServer) {
    return localServer
  }

  const serverModulePath = path.join(__dirname, '..', 'local-server.mjs')
  const { startLocalServer } = await import(pathToFileURL(serverModulePath).href)
  localServer = await startDesktopServer(startLocalServer, { protocol, net })

  return localServer
}

async function createMainWindow() {
  const server = await startServer()

  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: '#eaf8ff',
    height: 900,
    minHeight: 680,
    minWidth: 1024,
    show: false,
    title: 'Aquarium',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    width: 1440,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  await mainWindow.loadURL(server.url)
}

app.on('second-instance', () => {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
})

function handleStartupError(error) {
  console.error(error)
  dialog.showErrorBox('Aquarium could not open', error.message || 'An unexpected startup error occurred.')
  app.exit(1)
}

if (gotSingleInstanceLock) {
  app.whenReady().then(createMainWindow).catch(handleStartupError)
}

app.on('activate', () => {
  if (gotSingleInstanceLock && BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch(handleStartupError)
  }
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (localServer) {
    await localServer.close()
    localServer = null
  }
})
