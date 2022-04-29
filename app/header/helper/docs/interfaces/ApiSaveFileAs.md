[Helper Interfaces](../README.md) / ApiSaveFileAs

# Interface: ApiSaveFileAs

## Callable

### ApiSaveFileAs

▸ **ApiSaveFileAs**(`name`, `data`, `encoding?`, `title?`, `fileExt?`): `Promise`<``null`` \| `string`\>

Launch a dialog to ask user where to save a file then save it

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"savefileas"`` | Method name |
| `data` | `string` | Data of the file |
| `encoding?` | `string` | Specify how to save the file properly (default to `utf8`) |
| `title?` | `string` | Title of the dialog (default to `Save File As...`) |
| `fileExt?` | [`FileExtension`](FileExtension.md)[] | Extensions shown in the dialog |

#### Returns

`Promise`<``null`` \| `string`\>

A Promise that resolves to the directory of the saved file,
or null if the user cancels or the file cannot be saved
