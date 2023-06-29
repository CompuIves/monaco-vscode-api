import '../missing-services'
import { IEditorOverrideServices } from 'vs/editor/standalone/browser/standaloneServices'
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors'
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences'
import { PreferencesService } from 'vs/workbench/services/preferences/browser/preferencesService'
import { IPreferencesSearchService } from 'vs/workbench/contrib/preferences/common/preferences'
import { PreferencesSearchService } from 'vs/workbench/contrib/preferences/browser/preferencesSearch'
import { IKeybindingEditingService, KeybindingsEditingService } from 'vs/workbench/services/keybinding/common/keybindingEditing'
import 'vs/workbench/contrib/preferences/browser/preferences.contribution'

export default function getServiceOverride (): IEditorOverrideServices {
  return {
    [IPreferencesService.toString()]: new SyncDescriptor(PreferencesService),
    [IPreferencesSearchService.toString()]: new SyncDescriptor(PreferencesSearchService),
    [IKeybindingEditingService.toString()]: new SyncDescriptor(KeybindingsEditingService)
  }
}
