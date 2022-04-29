[Helper Interfaces](../README.md) / ApiSaveFile

# Interface: ApiSaveFile

## Callable

### ApiSaveFile

▸ **ApiSaveFile**(`name`, `dir`, `data`, `encoding?`): `Promise`<`boolean`\>

Save data to a file

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"savefile"`` | Method name |
| `dir` | `string` | Directory of the file (must be inside the component folder) |
| `data` | `string` | Data of the file |
| `encoding?` | `string` | Specify how to save the file properly (default to `utf8`) |

#### Returns

`Promise`<`boolean`\>

A Promise that resolves to true if the file has been saved, false otherwise
