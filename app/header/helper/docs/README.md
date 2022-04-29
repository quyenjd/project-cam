Helper Interfaces

# Helper Interfaces

## Table of contents

### Callback Interfaces

- [EventBackupListener](interfaces/EventBackupListener.md)
- [EventErrorListener](interfaces/EventErrorListener.md)
- [EventNewInputListener](interfaces/EventNewInputListener.md)
- [EventPortListener](interfaces/EventPortListener.md)
- [EventRestoreListener](interfaces/EventRestoreListener.md)
- [EventWillRemoveListener](interfaces/EventWillRemoveListener.md)
- [OnReadyCallback](interfaces/OnReadyCallback.md)

### Event Interfaces

- [EventBackup](interfaces/EventBackup.md)
- [EventError](interfaces/EventError.md)
- [EventNewInput](interfaces/EventNewInput.md)
- [EventPort](interfaces/EventPort.md)
- [EventRestore](interfaces/EventRestore.md)
- [EventWillRemove](interfaces/EventWillRemove.md)

### Global Interfaces

- [TApi](interfaces/TApi.md)
- [TEvent](interfaces/TEvent.md)

### Input Interfaces

- [ApiFetchOptions](interfaces/ApiFetchOptions.md)
- [ApiRunCommandInShellOptions](interfaces/ApiRunCommandInShellOptions.md)
- [ApiRunCommandOptions](interfaces/ApiRunCommandOptions.md)
- [ApiRunFileOptions](interfaces/ApiRunFileOptions.md)
- [FileExtension](interfaces/FileExtension.md)

### Methods Interfaces

- [ApiAlert](interfaces/ApiAlert.md)
- [ApiBindToPort](interfaces/ApiBindToPort.md)
- [ApiComponentAddInputParam](interfaces/ApiComponentAddInputParam.md)
- [ApiComponentAddOutputParam](interfaces/ApiComponentAddOutputParam.md)
- [ApiComponentGetAllParams](interfaces/ApiComponentGetAllParams.md)
- [ApiComponentGetBackground](interfaces/ApiComponentGetBackground.md)
- [ApiComponentGetEntity](interfaces/ApiComponentGetEntity.md)
- [ApiComponentGetName](interfaces/ApiComponentGetName.md)
- [ApiComponentHasInputParam](interfaces/ApiComponentHasInputParam.md)
- [ApiComponentHasOutputParam](interfaces/ApiComponentHasOutputParam.md)
- [ApiComponentRemoveInputParam](interfaces/ApiComponentRemoveInputParam.md)
- [ApiComponentRemoveOutputParam](interfaces/ApiComponentRemoveOutputParam.md)
- [ApiComponentSetBackground](interfaces/ApiComponentSetBackground.md)
- [ApiComponentSetName](interfaces/ApiComponentSetName.md)
- [ApiConfirm](interfaces/ApiConfirm.md)
- [ApiFetch](interfaces/ApiFetch.md)
- [ApiGetField](interfaces/ApiGetField.md)
- [ApiNewOutput](interfaces/ApiNewOutput.md)
- [ApiReadFile](interfaces/ApiReadFile.md)
- [ApiReadFileAbsolute](interfaces/ApiReadFileAbsolute.md)
- [ApiReadFileFrom](interfaces/ApiReadFileFrom.md)
- [ApiRunCommand](interfaces/ApiRunCommand.md)
- [ApiRunCommandInShell](interfaces/ApiRunCommandInShell.md)
- [ApiRunFile](interfaces/ApiRunFile.md)
- [ApiSaveFile](interfaces/ApiSaveFile.md)
- [ApiSaveFileAbsolute](interfaces/ApiSaveFileAbsolute.md)
- [ApiSaveFileAs](interfaces/ApiSaveFileAs.md)
- [ApiSendToPort](interfaces/ApiSendToPort.md)
- [ApiSetField](interfaces/ApiSetField.md)
- [ApiSystemInfo](interfaces/ApiSystemInfo.md)
- [ApiUnbindFromPort](interfaces/ApiUnbindFromPort.md)

### Output Interfaces

- [ApiFetchResponse](interfaces/ApiFetchResponse.md)
- [ApiRunResponse](interfaces/ApiRunResponse.md)
- [FileData](interfaces/FileData.md)

### Functions

- [default](README.md#default)

## Functions

### default

▸ **default**(`cb`): `void`

Connect to the application and call `cb`. This function can only be called **once**.

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | [`OnReadyCallback`](interfaces/OnReadyCallback.md) |

#### Returns

`void`
