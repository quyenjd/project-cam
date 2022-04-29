[Helper Interfaces](../README.md) / TEvent

# Interface: TEvent

## Table of contents

### Properties

- [bind](TEvent.md#bind)

### Methods

- [call](TEvent.md#call)
- [reset](TEvent.md#reset)
- [unbind](TEvent.md#unbind)

## Properties

### bind

• **bind**: [`EventNewInput`](EventNewInput.md) & [`EventBackup`](EventBackup.md) & [`EventRestore`](EventRestore.md) & [`EventWillRemove`](EventWillRemove.md) & [`EventError`](EventError.md) & [`EventPort`](EventPort.md)

Bind a listener to an event. Note that there is only one listener per event and
calling `bind` twice on an event will override the old listener with the new one.

## Methods

### call

▸ **call**(`name`, `thisArg`, ...`args`): `Promise`<`unknown`\>

Call the listener of an event asynchronously

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `thisArg` | `any` |
| `...args` | `any` |

#### Returns

`Promise`<`unknown`\>

___

### reset

▸ **reset**(): `void`

Remove all listeners of all events

#### Returns

`void`

___

### unbind

▸ **unbind**(`name`): `void`

Unbind the listener from an event

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`void`
