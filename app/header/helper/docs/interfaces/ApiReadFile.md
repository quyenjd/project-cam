[Helper Interfaces](../README.md) / ApiReadFile

# Interface: ApiReadFile

## Callable

### ApiReadFile

▸ **ApiReadFile**(`name`, `dir`, `encoding?`): `Promise`<``null`` \| `string`\>

Read the content of a file

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"readfile"`` | Method name |
| `dir` | `string` | Directory of the file (must be inside the component folder) |
| `encoding?` | `string` | Specify how to read the file properly (default to `utf8`) |

#### Returns

`Promise`<``null`` \| `string`\>

A Promise that resolves to the content of the file, or null if the file cannot be read
