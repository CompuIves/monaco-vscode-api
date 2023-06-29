import type * as vscode from 'vscode'
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions'
import { getExtHostServices } from '../ext-host/extHost'

export default function create (getExtension: () => IExtensionDescription): typeof vscode.commands {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerCommand (id: string, command: <T>(...args: any[]) => T | Thenable<T>, thisArgs?: any): vscode.Disposable {
      const { extHostCommands } = getExtHostServices()
      return extHostCommands.registerCommand(true, id, command, thisArgs, undefined, getExtension())
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerTextEditorCommand (id: string, callback: (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void, thisArg?: any): vscode.Disposable {
      const { extHostCommands, extHostEditors, extHostLogService } = getExtHostServices()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return extHostCommands.registerCommand(true, id, (...args: any[]): any => {
        const activeTextEditor = extHostEditors.getActiveTextEditor()
        if (activeTextEditor == null) {
          extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.')
          return undefined
        }

        return activeTextEditor.edit((edit: vscode.TextEditorEdit) => {
          callback.apply(thisArg, [activeTextEditor, edit, ...args])
        }).then((result) => {
          if (!result) {
            extHostLogService.warn('Edits from command ' + id + ' were not applied.')
          }
        }, (err) => {
          extHostLogService.warn('An error occurred while running command ' + id, err)
        })
      }, undefined, undefined, getExtension())
    },
    executeCommand<T> (id: string, ...args: any[]): Thenable<T> {
      const { extHostCommands } = getExtHostServices()
      return extHostCommands.executeCommand<T>(id, ...args)
    },
    getCommands (filterInternal: boolean = false): Thenable<string[]> {
      const { extHostCommands } = getExtHostServices()
      return extHostCommands.getCommands(filterInternal)
    }
  }
}
