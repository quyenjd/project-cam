[Helper Interfaces](../README.md) / ApiSaveFileAbsolute

# Interface: ApiSaveFileAbsolute

## Callable

### ApiSaveFileAbsolute

▸ **ApiSaveFileAbsolute**(`name`, `dir`, `data`, `encoding?`): `Promise`<`boolean`\>

Save data to a file using its absolute path (will require permission from application)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"savefileabsolute"`` | Method name |
| `dir` | `string` | Absolute directory of the file |
| `data` | `string` | Data of the file |
| `encoding?` | `string` | Specify how to save the file properly (default to `utf8`) |

#### Returns

`Promise`<`boolean`\>

A Promise that resolves to true if the file has been saved,
false if the file cannot be saved or the operation is not allowed
