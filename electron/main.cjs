const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

let localServer = null
let mainWindow = null

async function startServer() {
  if (localServer) {
    return localServer
  }

  const serverModulePath = path.join(__dirname, '..', 'local-server.mjs')
  const { startLocalServer } = await import(pathToFileURL(serverModulePath).href)
  localServer = await startLocalServer({ open: false, port: 0 })

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

app.whenReady().then(createMainWindow).catch((error) => {
  console.error(error)
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((error) => {
      console.error(error)
      app.quit()
    })
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
