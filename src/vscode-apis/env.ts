import type * as vscode from 'vscode'
import { Event } from 'vs/base/common/event'
import { URI } from 'vs/base/common/uri'
import { matchesScheme } from 'vs/platform/opener/common/opener'
import { Schemas } from 'vs/base/common/network'
import { ExtHostTelemetryLogger } from 'vs/workbench/api/common/extHostTelemetry'
import { IExtHostInitDataService } from 'vs/workbench/api/common/extHostInitDataService'
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions'
import { StandaloneServices } from 'vs/editor/standalone/browser/standaloneServices'
import { getExtHostServices } from '../extHost'

export default function create (getExtension: () => IExtensionDescription): typeof vscode.env {
  return {
    get machineId () { return StandaloneServices.get(IExtHostInitDataService).telemetryInfo.machineId },
    get sessionId () { return StandaloneServices.get(IExtHostInitDataService).telemetryInfo.sessionId },
    get language () { return StandaloneServices.get(IExtHostInitDataService).environment.appLanguage },
    get appName () { return StandaloneServices.get(IExtHostInitDataService).environment.appName },
    get appRoot () { return StandaloneServices.get(IExtHostInitDataService).environment.appRoot?.fsPath ?? '' },
    get appHost () { return StandaloneServices.get(IExtHostInitDataService).environment.appHost },
    get uriScheme () { return StandaloneServices.get(IExtHostInitDataService).environment.appUriScheme },

    get clipboard () {
      const { extHostClipboard } = getExtHostServices()
      return extHostClipboard.value
    },
    remoteName: undefined,
    get shell () {
      const { extHostTerminalService } = getExtHostServices()
      return extHostTerminalService.getDefaultShell(false)
    },
    get uiKind () {
      return StandaloneServices.get(IExtHostInitDataService).uiKind
    },
    async asExternalUri (uri: URI) {
      const { extHostWindow } = getExtHostServices()
      try {
        return await extHostWindow.asExternalUri(uri, { allowTunneling: false })
      } catch (err) {
        if (matchesScheme(uri, Schemas.http) || matchesScheme(uri, Schemas.https)) {
          return uri
        }

        throw err
      }
    },
    openExternal: async (uri: vscode.Uri, options?: { allowContributedOpeners?: boolean | string}) => {
      const { extHostWindow } = getExtHostServices()
      return extHostWindow.openUri(uri, {
        allowTunneling: false,
        allowContributedOpeners: options?.allowContributedOpeners
      })
    },
    isNewAppInstall: false,
    get isTelemetryEnabled () {
      const { extHostTelemetry } = getExtHostServices()
      return extHostTelemetry.getTelemetryConfiguration()
    },
    get onDidChangeTelemetryEnabled (): Event<boolean> {
      const { extHostTelemetry } = getExtHostServices()
      return extHostTelemetry.onDidChangeTelemetryEnabled
    },
    createTelemetryLogger (sender: vscode.TelemetrySender): vscode.TelemetryLogger {
      const { extHostTelemetry } = getExtHostServices()

      ExtHostTelemetryLogger.validateSender(sender)
      return extHostTelemetry.instantiateLogger(getExtension(), sender)
    },
    get logLevel () {
      const { extHostLogService } = getExtHostServices()
      return extHostLogService.getLevel()
    },
    get onDidChangeLogLevel () {
      const { extHostLogService } = getExtHostServices()
      return extHostLogService.onDidChangeLogLevel
    }
  }
}
