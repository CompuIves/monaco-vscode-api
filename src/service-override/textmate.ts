import '../polyfill'
import '../vscode-services/missing-services'
import { IEditorOverrideServices } from 'vs/editor/standalone/browser/standaloneServices'
import { ITextMateTokenizationService } from 'vs/workbench/services/textMate/browser/textMateTokenizationFeature'
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors'
import { TextMateTokenizationFeature } from 'vs/workbench/services/textMate/browser/textMateTokenizationFeatureImpl'
import _onigWasm from 'vscode-oniguruma/release/onig.wasm'
import getFileServiceOverride from './files'
import { registerAssets } from '../assets'
import { registerServiceInitializeParticipant } from '../services'
registerAssets({
  'vscode-oniguruma/../onig.wasm': _onigWasm
})

registerServiceInitializeParticipant(async (accessor) => {
  // Force load the service
  accessor.get(ITextMateTokenizationService)
})

export default function getServiceOverride (): IEditorOverrideServices {
  return {
    ...getFileServiceOverride(),
    [ITextMateTokenizationService.toString()]: new SyncDescriptor(TextMateTokenizationFeature)
  }
}

export {
  ITextMateTokenizationService
}
