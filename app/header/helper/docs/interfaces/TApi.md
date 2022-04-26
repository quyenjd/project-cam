[Helper Interfaces](../README.md) / TApi

# Interface: TApi

## Table of contents

### Properties

- [call](TApi.md#call)

### Methods

- [destroy](TApi.md#destroy)

## Properties

### call

• **call**: [`ApiAlert`](ApiAlert.md) & [`ApiConfirm`](ApiConfirm.md) & [`ApiGetField`](ApiGetField.md) & [`ApiSetField`](ApiSetField.md) & [`ApiNewOutput`](ApiNewOutput.md) & [`ApiReadFile`](ApiReadFile.md) & [`ApiReadFileAbsolute`](ApiReadFileAbsolute.md) & [`ApiReadFileFrom`](ApiReadFileFrom.md) & [`ApiSaveFile`](ApiSaveFile.md) & [`ApiSaveFileAbsolute`](ApiSaveFileAbsolute.md) & [`ApiSaveFileAs`](ApiSaveFileAs.md) & [`ApiRunFile`](ApiRunFile.md) & [`ApiRunCommand`](ApiRunCommand.md) & [`ApiRunCommandInShell`](ApiRunCommandInShell.md) & [`ApiSystemInfo`](ApiSystemInfo.md) & [`ApiFetch`](ApiFetch.md) & [`ApiBindToPort`](ApiBindToPort.md) & [`ApiUnbindFromPort`](ApiUnbindFromPort.md) & [`ApiSendToPort`](ApiSendToPort.md) & [`ApiComponentGetEntity`](ApiComponentGetEntity.md) & [`ApiComponentGetName`](ApiComponentGetName.md) & [`ApiComponentSetName`](ApiComponentSetName.md) & [`ApiComponentGetBackground`](ApiComponentGetBackground.md) & [`ApiComponentSetBackground`](ApiComponentSetBackground.md) & [`ApiComponentAddInputParam`](ApiComponentAddInputParam.md) & [`ApiComponentHasInputParam`](ApiComponentHasInputParam.md) & [`ApiComponentRemoveInputParam`](ApiComponentRemoveInputParam.md) & [`ApiComponentAddOutputParam`](ApiComponentAddOutputParam.md) & [`ApiComponentHasOutputParam`](ApiComponentHasOutputParam.md) & [`ApiComponentRemoveOutputParam`](ApiComponentRemoveOutputParam.md) & [`ApiComponentGetAllParams`](ApiComponentGetAllParams.md)

Call an API method. Watch out for `undefined` after resolving in case the API cannot process the request!

## Methods

### destroy

▸ **destroy**(): `void`

Destroy the sender of the API

#### Returns

`void`
