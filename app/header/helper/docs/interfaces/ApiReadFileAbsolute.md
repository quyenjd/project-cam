[Helper Interfaces](../README.md) / ApiReadFileAbsolute

# Interface: ApiReadFileAbsolute

## Callable

### ApiReadFileAbsolute

▸ **ApiReadFileAbsolute**(`name`, `dir`, `encoding?`): `Promise`<``null`` \| `string`\>

Read the content of a file using its absolute path (will require permission from application)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"readfileabsolute"`` | Method name |
| `dir` | `string` | Absolute directory of the file |
| `encoding?` | `string` | Specify how to read the file properly (default to `utf8`) |

#### Returns

`Promise`<``null`` \| `string`\>

A Promise that resolves to the content of the file(s), or null
if the file does not exist or the operation is not allowed
